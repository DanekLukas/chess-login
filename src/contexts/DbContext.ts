import { TFigure, position } from '../utils'
import { createContext } from 'react'

type State = {
  clearTable: (name?: string) => Promise<void>
  getAllFigures: (where?: {}) => Promise<TFigure[]>
  getFigureAtPosition: (position: position) => Promise<TFigure | undefined>
  placeFigure: (figure: TFigure) => Promise<boolean>
  moveFigure: (figure: TFigure, position: position) => Promise<boolean>
}

export const DbContext = createContext<State>({
  clearTable: async () => undefined,
  getAllFigures: async () => [],
  getFigureAtPosition: async () => undefined,
  placeFigure: async () => false,
  moveFigure: async () => false,
})
