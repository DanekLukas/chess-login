import { ConnectionContext } from '../contexts/ConnectionContext'
import { MessagesContext } from '../contexts/MessagesContext'
import { useContext, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const Homepage = () => {
  const navigate = useNavigate()
  const { chooseNickName, createOffer, refNavigate, peers } = useContext(ConnectionContext)
  const nameRef = useRef<HTMLInputElement>(null)
  const myRef = useRef<string>()

  const { messages } = useContext(MessagesContext)

  useEffect(() => {
    refNavigate!.current = navigate
  }, [navigate, refNavigate])

  return (
    <div className='main'>
      <h1>Šachy</h1>
      {!myRef.current && (
        <form
          onSubmit={e => {
            e.preventDefault()
            if (nameRef.current?.value) myRef.current = chooseNickName(nameRef.current?.value)
          }}
        >
          <label>Jméno: </label>
          <input type={nameRef.current?.value && 'text'} name='name' ref={nameRef} />
          <input type='submit' value='použít' />
        </form>
      )}
      {peers &&
        peers.map((peer, index) => (
          <div
            key={index}
            onClick={async () => {
              if (myRef.current && myRef.current !== peer) await createOffer(peer, myRef.current)
            }}
          >
            {peer}
          </div>
        ))}
      <div>
        {messages.map((message, index) => (
          <p key={index}>{message}</p>
        ))}
      </div>
    </div>
  )
}

export default Homepage
