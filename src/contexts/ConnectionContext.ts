import { NavigateFunction } from 'react-router-dom'
import { createContext } from 'react'

type State = {
  chooseNickName: (name: string) => string | undefined
  createOffer: (peer: string, me: string) => Promise<void>
  shareSendMove: (message: string) => void
  refNavigate: React.MutableRefObject<NavigateFunction | undefined> | undefined
  peers: string[]
  socket: WebSocket | undefined
  channelInstance: React.MutableRefObject<RTCDataChannel | undefined> | undefined
}

export const ConnectionContext = createContext<State>({
  chooseNickName: () => undefined,
  createOffer: async () => undefined,
  shareSendMove: () => undefined,
  refNavigate: undefined,
  peers: [],
  socket: undefined,
  channelInstance: undefined,
})
