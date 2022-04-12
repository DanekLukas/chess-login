import { MessagesContext } from '../contexts/MessagesContext'
import { TFigure, color, position } from '../utils'
import { fromBase64, toBase64 } from 'js-base64'
import { useContext, useEffect, useRef, useState } from 'react'

type Props = {
  moveFig: (
    fig: {
      horizontal: string
      vertical: string
      fig?: TFigure | undefined
    }[],
    fromNet?: boolean
  ) => Promise<boolean>
  moveOneFig: string | undefined
  changeChcolor: (color: color) => void
}

const Connect = ({ moveFig, moveOneFig, changeChcolor }: Props) => {
  const CHANNEL_LABEL = 'chat'
  // const select = { offer: 'offer', answer: 'answer', check: 'check' }
  const channelInstance = useRef<RTCDataChannel>()
  const peerConnection = useRef<RTCPeerConnection>()
  const [isConnected, setIsConnected] = useState(false)

  // const inputs = {
  //   myId: { label: 'Mé id', id: 'my-id' },
  //   peerId: { label: 'Peer id', id: 'peer-id' },
  //   message: { label: 'Zpráva', id: 'message' },
  // }

  const { addMessage } = useContext(MessagesContext)

  useEffect(() => {
    const sendMove = (message: string) => {
      if (channelInstance && channelInstance.current?.readyState === 'open') {
        channelInstance.current.send(toBase64(message))
      }
    }
    if (!moveOneFig) return
    sendMove(JSON.stringify(moveOneFig))
  }, [moveOneFig])

  if (!peerConnection.current) {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: 'stun:stun.services.mozilla.com',
          username: 'louis@mozilla.com',
          credential: 'webrtcdemo',
        },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    })
  }

  if (!peerConnection.current) return <div>No connection</div>

  peerConnection.current.onicecandidate = event => {
    if (event.candidate === null && peerConnection.current?.localDescription) {
      peerConnection.current?.localDescription.sdp.replace('b=AS:30', 'b=AS:1638400')
    }
  }

  const setupChannelAsAHost = () => {
    try {
      const channelIns = peerConnection.current?.createDataChannel(CHANNEL_LABEL)

      channelIns!.onopen = () => {
        onChannelOpen()
        changeChcolor(color.white)
      }

      channelIns!.onmessage = event => {
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
          moveFig(tmp, true)
        } catch (Error) {
          addMessage(decMessage)
        }
      }

      channelInstance.current = channelIns
    } catch (e) {
      console.error('No data channel (peerConnection)', e)
    }
  }

  const setupChannelAsASlave = () => {
    peerConnection.current!.ondatachannel = event => {
      const channelIns = event.channel

      channelIns.onopen = () => {
        onChannelOpen()
        changeChcolor(color.black)
      }

      channelIns.onmessage = event => {
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
          moveFig(tmp, true)
        } catch (Error) {
          addMessage(decMessage)
        }
      }
      channelInstance.current = channelIns
    }
  }

  const getElements = (e: React.FormEvent<HTMLFormElement>, tagName: string) => {
    return Array.prototype.slice.call(e.currentTarget.getElementsByTagName(tagName))
  }

  const onChannelOpen = () => {
    setIsConnected(true)
  }

  const createAnswer = async (remoteDescription: string) => {
    await peerConnection.current?.setRemoteDescription(
      new RTCSessionDescription(JSON.parse(remoteDescription))
    )
    if (
      peerConnection.current?.connectionState === 'new' &&
      peerConnection.current.signalingState !== 'stable'
    ) {
      const description = await peerConnection.current.createAnswer()
      peerConnection.current.setLocalDescription(description as RTCLocalSessionDescriptionInit)
    }
  }

  const exportToClipboard = (timeout: number = 100) => {
    setTimeout(() => {
      const rm = JSON.stringify(peerConnection.current?.localDescription?.toJSON())
      navigator.clipboard.writeText(toBase64(rm))
    }, timeout)
  }

  const connect = async (e: React.FormEvent<HTMLFormElement>) => {
    // const val = { myId: '', peerId: '', message: '' }
    e.preventDefault()

    // const inputs = getElements(e, 'input')

    // Object.keys(val).forEach(
    //   key =>
    //     (val[key as keyof typeof val] = inputs[inputs.findIndex(item => key === item.name)].value)
    // )

    const remoteDescription = fromBase64(getElements(e, 'textarea')[0].value)
    if (remoteDescription === '') {
      const description = await peerConnection.current?.createOffer()
      peerConnection.current?.setLocalDescription(description as RTCLocalSessionDescriptionInit)
      setupChannelAsAHost()
      if (peerConnection.current?.onsignalingstatechange === null)
        peerConnection.current.onsignalingstatechange = async () => {
          const description = await peerConnection.current?.createOffer()
          peerConnection.current?.setLocalDescription(description as RTCLocalSessionDescriptionInit)
          exportToClipboard()
        }
    } else {
      createAnswer(remoteDescription)
      if (peerConnection.current?.ondatachannel === null) setupChannelAsASlave()
      if (peerConnection.current?.onsignalingstatechange === null)
        peerConnection.current.onsignalingstatechange = () => {
          exportToClipboard()
        }
    }
  }

  const send = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const textArea = getElements(e, 'textarea')[0]
    const message = textArea.value
    if (channelInstance && channelInstance.current?.readyState === 'open') {
      channelInstance.current.send(toBase64(message))
      textArea.value = ''
    }
  }

  return (
    <>
      <h1>Spojení</h1>
      {!isConnected && (
        <form onSubmit={connect} style={{ width: '20rem' }}>
          {/* {Object.keys(inputs).map((key, index) => (
            <div key={index} style={{ textAlign: 'right', lineHeight: '2rem' }}>
              <label htmlFor={inputs[key as keyof typeof inputs].id}>
                {`${inputs[key as keyof typeof inputs].label}: `}
              </label>
              <input type='text' name={key} id={inputs[key as keyof typeof inputs].id} required />
            </div>
          ))} */}
          <div style={{ textAlign: 'right', lineHeight: '2rem' }}>
            {/* <select name='todo'>
              {Object.keys(select).map((key, index) => (
                <option key={index} value={key}>
                  {select[key as keyof typeof select]}
                </option>
              ))}
            </select> */}
          </div>
          <div style={{ textAlign: 'right', lineHeight: '2rem' }}>
            <textarea name='remoteDescription'></textarea>
          </div>
          <div>
            <input type='submit' name='submit' value='Odeslat' />
          </div>
        </form>
      )}
      {isConnected && (
        <form onSubmit={send} style={{ width: '20rem' }}>
          <div style={{ textAlign: 'right', lineHeight: '2rem' }}>
            <textarea name='chatMessage'></textarea>
          </div>
          <div>
            <input type='submit' name='send' value='Poslat' />
          </div>
        </form>
      )}
    </>
  )
}

export default Connect
