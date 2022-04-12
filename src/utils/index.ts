import {
  A,
  H,
  color,
  convertToDBFigure,
  figure,
  getCharRange,
  getNumRange,
  getRange,
  side,
} from './chess'

export { A, H, getRange, getCharRange, getNumRange, figure, color, side, convertToDBFigure }

export type position = {
  horizontal: string
  vertical: string
}

export type TFigure = position & {
  figure: figure
  color: color
  side: string
}
