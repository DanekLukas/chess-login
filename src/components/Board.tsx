import { A, H, TFigure, color, figure, getCharRange, getNumRange, position } from '../utils'
import { ConnectionContext } from '../contexts/ConnectionContext'
import { DbContext } from '../contexts/DbContext'
import { MessagesContext } from '../contexts/MessagesContext'
import { fromBase64 } from 'js-base64'
import { useCallback, useContext, useEffect, useState } from 'react'
// import Connect from '../components/Connect'
// import Homepage from '../page/Homepage'
import styled from 'styled-components'

const Board = () => {
  const [chcolor, setChcolor] = useState(color.white)
  const getCondNumRange = (clr: color = chcolor) => {
    return clr === color.black ? getNumRange() : getNumRange().reverse()
  }

  const getCondCharRange = (clr: color = chcolor) => {
    return clr === color.black ? getCharRange().reverse() : getCharRange()
  }

  const { shareSendMove, channelInstance } = useContext(ConnectionContext)
  const { addMessage } = useContext(MessagesContext)

  const changeChcolor = (color: color) => {
    setChcolor(color)
    setNumRange(getCondNumRange(color))
    setCharRange(getCondCharRange(color))
  }

  const [numRange, setNumRange] = useState(getCondNumRange())
  const [charRange, setCharRange] = useState(getCondCharRange())
  const { clearTable, getAllFigures, placeFigure, moveFigure } = useContext(DbContext)
  const [figures, setFigures] = useState<TFigure[]>([])
  const [move, setMove] = useState<TFigure>()
  const [moveOneFig, setMoveOneFig] = useState<string | undefined>()
  const [available, setAvailable] = useState<position[]>([])
  const [playing, setPlaying] = useState(color.white)
  const [smallCastle, setSmallCastle] = useState({ white: -1, black: -1 })
  const [bigCastle, setBigCastle] = useState({ white: 1, black: 1 })
  const [kingMoved, setKingMoved] = useState({ white: false, black: false })

  const barvy = { black: 'Černá', white: 'Bílá' }

  const opositeChcolor = (chcolor: color) => {
    return chcolor === color.white ? color.black : color.white
  }

  const setKingMovedByPlayer = useCallback(
    (value: boolean) => {
      const kng = { ...kingMoved }
      kng[color[playing] as keyof typeof kingMoved] = value
      setKingMoved(kng)
    },
    [kingMoved, playing]
  )

  const setBigCastleByPlayer = useCallback(
    (value: number) => {
      const big = { ...bigCastle }
      big[color[playing] as keyof typeof bigCastle] = value
      setBigCastle(big)
    },
    [bigCastle, playing]
  )

  const setSmallCastleByPlayer = useCallback(
    (value: number) => {
      const small = { ...smallCastle }
      small[color[playing] as keyof typeof smallCastle] = value
      setSmallCastle(small)
    },
    [smallCastle, playing]
  )

  const filterFigure = useCallback(
    (horizontal: string, vertical: string) => {
      return figures.filter(
        figure => figure.horizontal === horizontal && figure.vertical === vertical
      )
    },
    [figures]
  )

  const moveFig = useCallback(
    async (
      fig: { horizontal: string; vertical: string; fig?: TFigure }[],
      fromNet: boolean = false
    ) => {
      const pro: { figure: TFigure; position: position }[] = []
      let clearMove = false
      fig.forEach(item => {
        const tmp = item.fig ? item.fig : move
        if (!item.fig) clearMove = true
        if (!tmp) return false
        const filtered = filterFigure(item.horizontal, item.vertical)
        filtered.forEach(found => {
          if (found.color !== playing) {
            pro.push({ figure: found, position: { horizontal: 'A', vertical: '0' } })
          }
        })
        pro.push({
          figure: tmp,
          position: { horizontal: item.horizontal, vertical: item.vertical },
        })
      })

      if (!fromNet) setMoveOneFig(JSON.stringify(pro))

      pro.forEach(async item => {
        if (item.figure.figure === figure.Tower) {
          if (item.position.horizontal === 'A') setSmallCastleByPlayer(0)
          else setBigCastleByPlayer(0)
        } else if (item.figure.figure === figure.King) setKingMovedByPlayer(true)
        const index = figures.findIndex(
          figure => JSON.stringify(item.figure) === JSON.stringify(figure)
        )
        if (index < 0) return false
        await moveFigure(item.figure, {
          horizontal: item.position.horizontal,
          vertical: item.position.vertical,
        })
        const tmp = [...figures]
        tmp[index].horizontal = item.position.horizontal
        tmp[index].vertical = item.position.vertical
        setFigures(tmp)
      })
      if (pro.length > 0) setPlaying(opositeChcolor(pro[pro.length - 1].figure.color))
      if (clearMove) setMove(undefined)
      return true
    },
    [
      figures,
      filterFigure,
      move,
      moveFigure,
      playing,
      setBigCastleByPlayer,
      setKingMovedByPlayer,
      setSmallCastleByPlayer,
    ]
  )

  useEffect(() => {
    if (channelInstance && channelInstance.current)
      channelInstance.current.onmessage = event => {
        const decMessage = fromBase64(event.data)
        try {
          const parsed: { figure: TFigure; position: position }[] = JSON.parse(
            JSON.parse(decMessage)
          )
          const tmp: { horizontal: string; vertical: string; fig: TFigure }[] = parsed.map(item => {
            const prd = {
              horizontal: item.position.horizontal,
              vertical: item.position.vertical,
              fig: item.figure,
            }
            return prd
          })
          if (moveFig) moveFig(tmp, true)
        } catch (Error) {
          addMessage(decMessage)
        }
      }
  }, [addMessage, channelInstance, moveFig])

  useEffect(() => {
    const sendMove = (message: string) => {
      shareSendMove(message)
    }
    if (!moveOneFig) return
    sendMove(JSON.stringify(moveOneFig))
  }, [moveOneFig, shareSendMove])

  const getReady = () => {
    const colors = [chcolor, opositeChcolor(chcolor)]
    const boardLine = chcolor === color.white ? ['1', '8'] : ['8', '1']
    const phalanxLine = chcolor === color.white ? ['2', '7'] : ['7', '2']
    const sides = ['Right', 'Left']

    colors.forEach((clr, index) => {
      charRange.forEach((item, charIndex) => {
        placeFigure({
          color: clr,
          figure: figure.Phalanx,
          side: (chcolor === color.white ? charRange.length - charIndex : charIndex + 1).toString(),
          horizontal: item.toString(),
          vertical: phalanxLine[index],
        } as TFigure)
      })

      for (let i = 1; i <= 3; i++) {
        sides.forEach((side, sideIndex) => {
          placeFigure({
            color: clr,
            figure: figure[figure[i] as keyof typeof figure],
            side: side,
            horizontal: String.fromCharCode(
              A + sideIndex * 7 + (i - 1) * (sideIndex === 0 ? 1 : -1)
            ),
            vertical: boardLine[index],
          } as TFigure)
        })
      }
      for (let i = 4; i <= 5; i++) {
        placeFigure({
          color: clr,
          figure: figure[figure[i] as keyof typeof figure],
          side: '',
          horizontal: String.fromCharCode(H - i + 1),
          vertical: boardLine[index],
        } as TFigure)
      }
    })
  }

  const getFigures = useCallback(async () => {
    const figures = await getAllFigures()
    if (figures.length === 0) {
      return false
    }
    setFigures(figures)
    return true
  }, [getAllFigures])

  useEffect(() => {
    getFigures()
  }, [getFigures])

  const getClass = (pfigure: TFigure | undefined) => {
    if (!pfigure) return ''
    const fig = figure[pfigure.figure]
    const clr = color[pfigure.color]

    const side = fig === 'Horse' ? pfigure.side : ''
    return `${clr}${fig}${side}`.trim()
  }

  const getLetters = () => {
    return (
      <tr>
        <td></td>
        {charRange.map((chars, index) => (
          <Letter key={index}>{chars}</Letter>
        ))}
        <td></td>
      </tr>
    )
  }

  const findFigure = (horizontal: string, vertical: string) => {
    return figures.find(figure => figure.horizontal === horizontal && figure.vertical === vertical)
  }

  const findAvailable = (position: position) => {
    return available.find(
      item => item.horizontal === position.horizontal && item.vertical === position.vertical
    )
  }

  // const addAvailable = (pos: position[]) => {
  //   if (pos.length > 0) setAvailable([...available, ...pos])
  // }

  const front = (pos: position, white: boolean) => {
    const avail: position[] = []
    const mult = white ? 1 : -1
    const vert = parseInt(pos.vertical)
    const start = vert === (white ? 2 : 7) ? 1 : 0
    for (let i = 1; i < 2 + (start * avail.length === 0 ? 0 : 1); i++) {
      const front = vert + mult * i
      if (front < 9 && front > 0) {
        const charFront = front.toString()
        const found = findFigure(pos.horizontal, charFront)
        if (!found) {
          avail.push({ horizontal: pos.horizontal, vertical: charFront })
        }
      }
    }

    for (let i = -1; i <= 1; i += 2) {
      const front = vert + mult
      const side = pos.horizontal.charCodeAt(0) + i
      if (front < 9 && front > 0 && side >= A && side <= H) {
        const charFront = front.toString()
        const charSide = String.fromCharCode(side)
        const found = findFigure(charSide, charFront)
        if (found && found.color === color[white ? 'black' : 'white']) {
          avail.push({ horizontal: charSide, vertical: charFront })
        }
      }
    }
    return avail
  }

  const continuousStraight = (pos: position, white: boolean) => {
    const avail: position[] = []
    const vert = parseInt(pos.vertical)
    const hori = pos.horizontal.charCodeAt(0)
    for (let i = 1; i < 5; i++) {
      let straight = 0
      for (let j = 1; j < 2 + straight; j++) {
        const front = vert + (i < 3 ? (i % 2 === 0 ? 1 : -1) * j : 0)
        const side = hori + (i < 3 ? 0 : i % 2 === 0 ? 1 : -1) * j
        if (front < 9 && front > 0 && side <= H && side >= A) {
          const charFront = front.toString()
          const charSide = String.fromCharCode(side)
          const found = findFigure(charSide, charFront)
          if (!found || found.color === color[white ? 'black' : 'white']) {
            avail.push({ horizontal: charSide, vertical: charFront })
            if (!found) straight++
          }
        }
      }
    }
    return avail
  }

  const horseRule = (pos: position, white: boolean) => {
    const avail: position[] = []
    const vert = parseInt(pos.vertical)
    const hori = pos.horizontal.charCodeAt(0)
    for (let i = 1; i < 5; i++) {
      for (let j = -1; j <= 1; j += 2) {
        const front = vert + (i < 3 ? (i % 2 === 0 ? 1 : -1) * j : j * 2)
        const side = hori + (i < 3 ? 2 : i % 2 === 0 ? 1 : -1) * j
        if (front < 9 && front > 0 && side <= H && side >= A) {
          const charFront = front.toString()
          const charSide = String.fromCharCode(side)
          const found = findFigure(charSide, charFront)
          if (!found || found.color === color[white ? 'black' : 'white']) {
            avail.push({ horizontal: charSide, vertical: charFront })
          }
        }
      }
    }
    return avail
  }

  const continuousSideway = (pos: position, white: boolean) => {
    const avail: position[] = []
    const vert = parseInt(pos.vertical)
    const hori = pos.horizontal.charCodeAt(0)
    for (let i = 1; i < 5; i++) {
      let straight = 0
      for (let j = 1; j < 2 + straight; j++) {
        const front = vert + (i < 3 ? 1 : -1) * j
        const side = hori + (i % 2 === 0 ? 1 : -1) * j
        if (front < 9 && front > 0 && side <= H && side >= A) {
          const charFront = front.toString()
          const charSide = String.fromCharCode(side)
          const found = findFigure(charSide, charFront)
          if (!found || found.color === color[white ? 'black' : 'white']) {
            avail.push({ horizontal: charSide, vertical: charFront })
            if (!found) straight++
          }
        }
      }
    }
    return avail
  }

  const around = (pos: position, white: boolean) => {
    const avail: position[] = []
    const vert = parseInt(pos.vertical)
    const hori = pos.horizontal.charCodeAt(0)
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const front = vert + i
        const side = hori + j
        if (front < 9 && front > 0 && side <= H && side >= A && (i !== 0 || j !== 0)) {
          const charFront = front.toString()
          const charSide = String.fromCharCode(side)
          const found = findFigure(charSide, charFront)
          if (!found || found.color === color[white ? 'black' : 'white']) {
            avail.push({ horizontal: charSide, vertical: charFront })
          }
        }
      }
    }
    return avail
  }

  const castle = (pos: position, white: boolean) => {
    const avail: position[] = []
    const hori = pos.horizontal.charCodeAt(0)
    if (
      kingMoved[color[playing] as keyof typeof kingMoved] ||
      !smallCastle[color[playing] as keyof typeof smallCastle] ||
      !bigCastle[color[playing] as keyof typeof bigCastle]
    )
      return []
    for (
      let i = smallCastle[color[playing] as keyof typeof smallCastle];
      i <= bigCastle[color[playing] as keyof typeof bigCastle];
      i += 2
    ) {
      let straight = 1
      for (let j = 1; j < 1 + straight; j++) {
        const found = findFigure(String.fromCharCode(hori + i * j), pos.vertical)
        if (!found) {
          straight++
        } else if (found.figure === figure.Tower && ['A', 'H'].includes(found.horizontal)) {
          avail.push({ horizontal: found.horizontal, vertical: found.vertical })
        }
      }
    }
    return avail
  }

  const applyRules = (fig: TFigure) => {
    switch (figure[fig.figure]) {
      case figure[figure.Phalanx]:
        setAvailable(
          front(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          )
        )
        break
      case figure[figure.Tower]:
        setAvailable(
          continuousStraight(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          )
        )
        break
      case figure[figure.Horse]:
        setAvailable(
          horseRule(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          )
        )
        break
      case figure[figure.Bishop]:
        setAvailable(
          continuousSideway(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          )
        )
        break
      case figure[figure.Queen]:
        setAvailable([
          ...continuousSideway(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          ),
          ...continuousStraight(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          ),
        ])
        break
      case figure[figure.King]:
        setAvailable([
          ...around(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          ),
          ...castle(
            { horizontal: fig.horizontal, vertical: fig.vertical },
            color[fig.color] === 'white'
          ),
        ])
        break
    }
  }

  return (
    <>
      <table cellSpacing={0}>
        <tbody>
          <tr>
            <td></td>
            <td colSpan={8}>
              {figures
                .filter(
                  figure => figure.color === opositeChcolor(chcolor) && figure.vertical === '0'
                )
                .map((figure, index) => (
                  <Div
                    key={index}
                    onClick={() => {
                      setMove({ ...figure })
                    }}
                    className={getClass(figure)}
                  />
                ))}
            </td>
            <td></td>
          </tr>
          {getLetters()}
          {numRange.map((numIndex, lineIndex) => {
            const chars = lineIndex % 2 === 0 ? ['0', '1'] : ['1', '0']
            return (
              <tr key={lineIndex}>
                <td>{numIndex}</td>
                {charRange.map((char, index) => (
                  <Tile
                    key={index}
                    onClick={() => {
                      if (
                        move &&
                        ((move.horizontal === char && move.vertical === numIndex.toString()) ||
                          findAvailable({ horizontal: char, vertical: numIndex.toString() }))
                      ) {
                        setAvailable([])
                        const found = findFigure(char, numIndex.toString())
                        if (found && found.color === move.color) {
                          if (
                            move.figure === figure.King &&
                            found.figure === figure.Tower &&
                            !kingMoved[color[playing] as keyof typeof kingMoved] &&
                            (smallCastle[color[playing] as keyof typeof color] !== 0 ||
                              bigCastle[color[playing] as keyof typeof color] !== 0)
                          ) {
                            if (found.horizontal === 'H') {
                              moveFig([
                                { horizontal: 'G', vertical: move.vertical },
                                { horizontal: 'F', vertical: found.vertical, fig: found },
                              ])
                            } else {
                              moveFig([
                                { horizontal: 'B', vertical: move.vertical },
                                { horizontal: 'C', vertical: found.vertical, fig: found },
                              ])
                            }
                            return
                          }
                          setMove(undefined)
                          return
                        }
                        moveFig([{ horizontal: char, vertical: numIndex.toString() }])
                      } else {
                        const found = findFigure(char, numIndex.toString())
                        if (found && found.color === playing) {
                          applyRules(found)
                          setMove(found)
                        }
                      }
                    }}
                    className={`board_${index % 2 === 0 ? chars[0] : chars[1]} ${getClass(
                      findFigure(char, numIndex.toString())
                    )} ${
                      findAvailable({ horizontal: char, vertical: numIndex.toString() })
                        ? 'available'
                        : ''
                    }`}
                  />
                ))}
                <td>{numIndex}</td>
              </tr>
            )
          })}
          {getLetters()}
          <tr>
            <td></td>
            <td colSpan={8}>
              {figures
                .filter(figure => figure.color === chcolor && figure.vertical === '0')
                .map((figure, index) => (
                  <Div
                    key={index}
                    onClick={() => {
                      setMove({ ...figure })
                    }}
                    className={getClass(figure)}
                  />
                ))}
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <button
        onClick={async () => {
          clearTable()
          getReady()
          await getFigures()
        }}
      >
        novou hru
      </button>
      <button
        onClick={async () => {
          if (!(await getFigures())) {
            getReady()
            getFigures()
          }
        }}
      >
        připrav figurky
      </button>
      <select
        onChange={e => {
          changeChcolor(color[e.currentTarget.value as keyof typeof color])
        }}
        value={color[chcolor]}
      >
        {Object.keys(color)
          .filter(clr => clr.length > 2)
          .map((clr, index) => (
            <option key={index} value={clr}>
              {barvy[clr as keyof typeof barvy]}
            </option>
          ))}
      </select>
    </>
  )
}

const Tile = styled.td`
  width: 80px;
  height: 80px;
  border: 1px solid gray;
  margin: -2px 0;

  &.board_0 {
    background-color: gray;
  }
  &.board_1 {
    background-color: lightgray;
  }

  &.available {
    box-shadow: inset 0 0 8px blue;
  }

  @media (max-width: 800px) {
    width: 35px;
    height: 35px;
  }
`

const Letter = styled.td`
  width: 80px;

  @media (max-width: 800px) {
    width: 35px;
  }
`

const Div = styled.div`
  display: inline-block;
  width: 80px;
  height: 80px;
  margin: 0;

  @media (max-width: 800px) {
    width: 35px;
    height: 35px;
  }
`
export default Board
