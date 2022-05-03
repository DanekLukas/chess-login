import { ConnectionContext } from './ConnectionContext'
import { MessagesContext } from './MessagesContext'
import { NavigateFunction } from 'react-router-dom'
import { fromBase64, toBase64 } from 'js-base64'
import { useCallback, useContext, useEffect, useRef, useState } from 'react'

type Props = {
  children: React.ReactNode
}

const ConnectionProvider = ({ children }: Props) => {
  const ice = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] }
  const CHANNEL_LABEL = 'chat'
  const channelInstance = useRef<RTCDataChannel>()
  const peerConnection = useRef<RTCPeerConnection>()
  const socketRef = useRef<WebSocket>()
  const nameRef = useRef<string>('')
  const sendToRef = useRef<string>('')
  const navigateRef = useRef<NavigateFunction>()
  const candidateRef = useRef<string>()
  const [peers, setPeers] = useState<string[]>([])

  const { addMessage } = useContext(MessagesContext)

  const chooseNickName = (name: string) => {
    if (peers && peers.includes(name)) return undefined
    socketRef.current?.send(JSON.stringify({ do: 'nick', name: name }))
    nameRef.current = name
    return name
  }

  useEffect(() => {
    if (!socketRef.current) {
      try {
        socketRef.current = new WebSocket(`wss://chess-login.danek-family.cz:443/websockets`)
        socketRef.current.addEventListener('open', event => {
          socketRef.current?.send(JSON.stringify({ do: 'peers' }))
          socketRef.current?.send(JSON.stringify({ do: 'check' }))
        })
      } catch (Error) {
        console.error('WebSocket not available')
      }
    }
  }, [socketRef])

  const shareSendMove = (message: string) => {
    if (channelInstance && channelInstance.current?.readyState === 'open') {
      channelInstance.current.send(toBase64(message))
    }
  }

  const setupChannelAsASlave = useCallback(() => {
    peerConnection.current!.ondatachannel = event => {
      channelInstance.current = event.channel
    }
  }, [])

  const sendDataToWithTimeout = useCallback(() => {
    if (peerConnection.current?.iceConnectionState !== 'connected') {
      setTimeout(() => {
        const rm = JSON.stringify(peerConnection.current?.localDescription?.toJSON())
        socketRef.current?.send(
          JSON.stringify({
            do: 'sendTo',
            sendTo: sendToRef.current,
            sentBy: nameRef.current,
            recievedRemoteDescr: toBase64(rm),
          })
        )
      }, 100)
    }
  }, [socketRef])

  const sendDataNoTimeout = useCallback(() => {
    if (peerConnection.current?.connectionState !== 'connected') {
      const rm = JSON.stringify(peerConnection.current?.localDescription?.toJSON())
      if (!rm) return
      socketRef.current?.send(
        JSON.stringify({
          do: 'sendTo',
          sendTo: sendToRef.current,
          sentBy: nameRef.current,
          recievedRemoteDescr: toBase64(rm),
        })
      )
    }
  }, [socketRef])

  const createAnswer = useCallback(
    async (remoteDescription: string) => {
      try {
        const data = JSON.parse(remoteDescription)
        if (peerConnection.current?.remoteDescription && data.type === 'answer') return
        if (
          peerConnection.current?.signalingState !== 'stable' ||
          peerConnection.current?.remoteDescription === null
        ) {
          await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data))
        }
        if (
          !peerConnection.current ||
          peerConnection.current.iceConnectionState !== 'new' ||
          !['have-remote-offer', 'have-local-pranswer'].includes(
            peerConnection.current?.signalingState
          )
        )
          return
        if (peerConnection.current.localDescription !== null) return
        const description = await peerConnection.current.createAnswer()
        await peerConnection.current!.setLocalDescription(
          description as RTCLocalSessionDescriptionInit
        )
      } catch (Error) {
        console.error('create answer error')
      }
    },
    [
      /*socketRef*/
    ]
  )

  const connect = useCallback(
    async (description: string) => {
      await peerConnection.current?.setRemoteDescription(
        new RTCSessionDescription(JSON.parse(description))
      )
      if (peerConnection.current?.ondatachannel === null) setupChannelAsASlave()
      if (peerConnection.current?.onsignalingstatechange !== null) return
      peerConnection.current.onsignalingstatechange = () => {
        sendDataNoTimeout()
      }
    },
    [sendDataNoTimeout, setupChannelAsASlave]
  )

  // Listen for messages
  useEffect(() => {
    if (!socketRef) return
    if (socketRef.current?.onmessage === null) {
      socketRef.current.onmessage = event => {
        const value: Record<string, string> = JSON.parse(event.data)
        const keys = Object.keys(value)
        if (!keys.includes('do')) return
        switch (value.do) {
          case 'peers':
            setPeers(JSON.parse(event.data)['names'])
            break
          case 'offer':
            sendToRef.current = value.offeredBy
            connect(fromBase64(value.recievedRemoteDescr))
            break
          case 'send':
            sendToRef.current = value.acceptedBy
            createAnswer(fromBase64(value.recievedRemoteDescr))
            break
          case 'answerBy':
            if (!keys.includes('recievedRemoteDescr') || !keys.includes('acceptedBy')) return
            sendToRef.current = value.acceptedBy
            createAnswer(fromBase64(value.recievedRemoteDescr))
            break
          case 'candidate':
            const handleCandidate = async () => {
              try {
                const parsed = fromBase64(value['candidate'])
                const candidateInitDict: RTCIceCandidateInit = {
                  candidate: parsed,
                  sdpMLineIndex: 0,
                  // sdpMid: '',
                  // usernameFragment: '',
                }
                const candidate = new RTCIceCandidate(candidateInitDict)
                await peerConnection.current?.addIceCandidate(candidate)
              } catch (e: any) {
                addMessage(e.message)
              }
            }
            handleCandidate()
            break
        }
      }
    }
  }, [createAnswer, connect, socketRef, peers, addMessage])

  const stateChange = () => {
    if (peerConnection.current?.iceConnectionState === 'connected') {
      socketRef.current?.send(
        JSON.stringify({ do: 'leave', leave: [nameRef.current, sendToRef.current] })
      )
      if (navigateRef) navigateRef.current!('/connect')
    }
  }

  const iceCandidateHandler = (event: RTCPeerConnectionIceEvent) => {
    if (event.candidate === null) return
    if (sendToRef.current) {
      candidateRef.current = JSON.stringify({
        do: 'candidate',
        candidateFor: sendToRef.current,
        candidate: toBase64(event.candidate?.candidate || ''),
      })
      socketRef.current?.send(candidateRef.current)
    }
  }

  if (!peerConnection.current) {
    peerConnection.current = new RTCPeerConnection(ice)
    if (peerConnection.current.onicecandidate === null)
      peerConnection.current.onicecandidate = e => {
        iceCandidateHandler(e)
      }
    if (peerConnection.current.onconnectionstatechange === null)
      peerConnection.current.onconnectionstatechange = () => stateChange()
  }

  const setupChannelAsAHost = () => {
    try {
      channelInstance.current = peerConnection.current?.createDataChannel(CHANNEL_LABEL)
    } catch (e: any) {
      addMessage(`No data channel (peerConnection) ${e.message}`)
    }
  }

  if (!peerConnection.current) return <div>No connection</div>

  const createOffer = async (peer: string, me: string) => {
    setupChannelAsAHost()
    const description = await peerConnection.current?.createOffer()
    try {
      await peerConnection.current?.setLocalDescription(description)
    } catch (e) {
      console.error('create peerConnection error')
    }
    sendToRef.current = peer
    const rm = toBase64(
      JSON.stringify(peerConnection.current?.localDescription?.toJSON())
    ).toString()
    socketRef.current?.send(
      JSON.stringify({
        do: 'play',
        play: peer,
        with: me,
        recievedRemoteDescr: rm,
      })
    )
    sendDataToWithTimeout()
  }

  return (
    <ConnectionContext.Provider
      value={{
        chooseNickName,
        createOffer,
        shareSendMove,
        refNavigate: navigateRef,
        peers,
        socket: socketRef.current,
        name: nameRef.current,
        channelInstance,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export default ConnectionProvider
