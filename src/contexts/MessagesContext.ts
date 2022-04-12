import { createContext } from 'react'

type State = {
  addMessage: (message: string) => void
  messages: string[]
}

export const MessagesContext = createContext<State>({
  addMessage: (message: string) => undefined,
  messages: [],
})
