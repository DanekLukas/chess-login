import { MessagesContext } from '../contexts/MessagesContext'
import { useContext } from 'react'
import Board from '../components/Board'

const Connect = () => {
  const { messages } = useContext(MessagesContext)

  return (
    <>
      <Board />
      <div>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
    </>
  )
}

export default Connect
