import { TFigure } from '.'

export enum figure {
  'Phalanx',
  'Tower',
  'Horse',
  'Bishop',
  'Queen',
  'King',
}

export enum color {
  'black',
  'white',
}

export enum side {
  'Left',
  'Right',
}

export const A = 'A'.charCodeAt(0)
export const H = 'H'.charCodeAt(0)

export const getRange = () => Array.from(Array(8).keys())

export const getNumRange = () => getRange().map(itm => itm + 1)

export const getCharRange = () => getRange().map(itm => String.fromCharCode(A + itm))

export const convertToDBFigure = (figureValue: TFigure) => {
  return {
    Figure: figure[figureValue.figure],
    Color: color[figureValue.color],
    Side: figureValue.side,
    Vertical: figureValue.vertical,
    Horizontal: figureValue.horizontal,
  }
}
