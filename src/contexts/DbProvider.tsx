import { Connection } from 'jsstore'
import { DbContext } from './DbContext'
import { color as Ecolor, figure as Efigure, TFigure, convertToDBFigure, position } from '../utils'
import React, { useCallback, useEffect, useState } from 'react'

type Props = {
  children: React.ReactNode
}

const DbProvider = ({ children }: Props) => {
  const tbl = { chess: 'Chess' }
  const [connection, setConnection] = useState<Connection>()
  const dbName = 'Chess'

  const initDb = useCallback(() => {
    if (connection) return
    // initiate jsstore connection
    const worker = new Worker('jsstore.worker.js')
    const con = new Connection(worker)
    if (!con) return

    // step1 - create database schema
    const tblChess = {
      name: tbl.chess,
      columns: {
        // Here "Id" is name of column
        Id: { primaryKey: true, autoIncrement: true },
        Figure: { notNull: true, dataType: 'string' },
        Color: { notNull: true, dataType: 'string' },
        Side: { notNull: false, dataType: 'string' },
        Vertical: { notNull: true, dataType: 'string' },
        Horizontal: { notNull: true, dataType: 'string' },
      },
    }

    const db = {
      name: dbName,
      tables: [tblChess],
    }

    // step 2
    con.initDb(db)
    setConnection(con)
  }, [connection, tbl.chess])

  useEffect(() => {
    initDb()
  }, [initDb])

  const clearTable = async (name: string = tbl.chess) => {
    if (connection) await connection.clear(name)
  }

  const getAllFigures = async (where?: {}): Promise<TFigure[]> => {
    let query = { from: tbl.chess }
    if (where) query = { ...query, ...where }
    const results:
      | { Figure: string; Color: string; Side: string; Horizontal: string; Vertical: string }[]
      | undefined = await connection?.select(query)
    if (results === undefined || results.length === 0) return []
    const ret: TFigure[] = []
    results.forEach(result => {
      const pf: Efigure = (Efigure as any)[result.Figure]
      const cf: Ecolor = (Ecolor as any)[result.Color]
      ret.push({
        figure: pf,
        color: cf,
        side: result.Side,
        horizontal: result.Horizontal,
        vertical: result.Vertical,
      } as TFigure)
    })
    return ret
  }

  const getFigureAtPosition = async (position: position): Promise<TFigure | undefined> => {
    const results:
      | { Figure: string; Color: string; Side: string; Horizontal: string; Vertical: string }[]
      | undefined = await connection?.select({
      from: tbl.chess,
      where: { Vertical: position.vertical, Horizontal: position.horizontal },
    })
    if (results === undefined || results.length === 0) return undefined
    const result = results[0]
    const pf: Efigure = (Efigure as any)[result.Figure]
    const cf: Ecolor = (Ecolor as any)[result.Color]
    return {
      figure: pf,
      color: cf,
      side: result.Side || ' ',
      horizontal: result.Horizontal,
      vertical: result.Vertical,
    } as TFigure
  }

  const moveFigure = async (figure: TFigure, position: position): Promise<boolean> => {
    const rowCnt = await connection?.update({
      in: tbl.chess,
      set: { Horizontal: position.horizontal, Vertical: position.vertical },
      where: {
        Figure: Efigure[figure.figure],
        Color: Ecolor[figure.color],
        Side: figure.side || '',
      },
    })
    return rowCnt !== undefined && rowCnt > 0
  }

  const placeFigure = async (figure: TFigure): Promise<boolean> => {
    const rowCnt = await connection?.insert({
      into: tbl.chess,
      values: [convertToDBFigure(figure)],
    })
    return rowCnt !== undefined && rowCnt > 0
  }

  return (
    <DbContext.Provider
      value={{
        clearTable,
        getAllFigures,
        getFigureAtPosition,
        placeFigure,
        moveFigure,
      }}
    >
      {children}
    </DbContext.Provider>
  )
}
export default DbProvider
