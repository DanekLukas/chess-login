import { MessagesContext } from './MessagesContext'
import React, { useState } from 'react'

type Props = {
  children: React.ReactNode
}

const MessagesProvider = ({ children }: Props) => {
  const [messages, setMessages] = useState<Array<string>>([])
  const addMessage = (message: string) => {
    setMessages(prev => {
      const msg = [...prev]
      msg.unshift(message)
      return msg
    })
  }

  return (
    <MessagesContext.Provider
      value={{
        addMessage,
        messages,
      }}
    >
      {children}
    </MessagesContext.Provider>
  )
}

export default MessagesProvider
