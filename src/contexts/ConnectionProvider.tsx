import { ConnectionContext } from './ConnectionContext'
import { NavigateFunction } from 'react-router-dom'
import { fromBase64, toBase64 } from 'js-base64'
import { useCallback, useEffect, useRef, useState } from 'react'

type Props = {
  children: React.ReactNode
}

const ConnectionProvider = ({ children }: Props) => {
  const CHANNEL_LABEL = 'chat'
  const channelInstance = useRef<RTCDataChannel>()
  const peerConnection = useRef<RTCPeerConnection>()
  const [socket, setSocket] = useState<WebSocket>()
  const nameRef = useRef<string>('')
  const sendTo = useRef<string>('')
  const [peers, setPeers] = useState<string[]>([])
  const refNavigate = useRef<NavigateFunction>()

  const chooseNickName = (name: string) => {
    if (peers && peers.includes(name)) return undefined
    socket?.send(JSON.stringify({ name: name }))
    return name
  }

  useEffect(() => {
    if (!socket) {
      try {
        const sock = new WebSocket('ws://localhost:8080/websockets')
        sock.addEventListener('open', event => {
          sock.send(JSON.stringify({ peers: 'All' }))
          sock.send(JSON.stringify({ check: 'ws' }))
        })
        setSocket(sock)
      } catch (Error) {
        console.error('WebSocket not available')
      }
    }
  }, [socket])

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

  const sendDataTo = useCallback(() => {
    if (peerConnection.current?.connectionState !== 'connected')
      setTimeout(() => {
        const rm = JSON.stringify(peerConnection.current?.localDescription?.toJSON())
        socket?.send(
          JSON.stringify({
            sendTo: sendTo.current,
            sentBy: nameRef.current,
            recievedRemoteDescr: toBase64(rm),
          })
        )
      }, 100)
  }, [socket])

  const connect = useCallback(
    (remoteDescription: string) => {
      createAnswer(remoteDescription)
      if (peerConnection.current?.ondatachannel === null) setupChannelAsASlave()
      if (peerConnection.current?.onsignalingstatechange !== null) return
      peerConnection.current.onsignalingstatechange = () => {
        sendDataTo()
      }
    },
    [sendDataTo, setupChannelAsASlave]
  )

  const accept = useCallback(
    (remoteDescription: string) => {
      createAnswer(remoteDescription)
      if (peerConnection.current?.ondatachannel === null) setupChannelAsASlave()
    },
    [setupChannelAsASlave]
  )

  // Listen for messages
  useEffect(() => {
    const listener = (event: MessageEvent<any>) => {
      if (event.data.charAt(0) === '[') {
        setPeers(JSON.parse(event.data)['name'])
        const name = JSON.parse(event.data)
        const added: string[] = []
        name.forEach(
          (item: { name?: string; offeredBy?: string; recievedRemoteDescr?: string }) => {
            if (item.name) added.push(item.name)
          }
        )
        if (added && added.length > 0) setPeers(added)
        // if (peers && peers.length > 0) setPeers([...peers, ...added])
        // else setPeers(added)
      } else {
        const value: Record<string, string> = JSON.parse(event.data)
        if (Object.keys(value).includes('recievedRemoteDescr')) {
          const prd = value['recievedRemoteDescr']
          if (Object.keys(value).includes('offeredBy')) {
            sendTo.current = value['offeredBy']
            if (prd) connect(fromBase64(prd))
          } else if (Object.keys(value).includes('acceptedBy')) {
            if (prd) accept(fromBase64(prd))
          }
        }
      }
    }
    socket?.removeEventListener('message', listener)
    return socket?.addEventListener('message', listener)
  }, [accept, connect, socket])

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
    peerConnection.current.addEventListener('connectionstatechange', event => {
      if (peerConnection.current?.connectionState === 'connected') {
        if (refNavigate) refNavigate.current!('/connect')
      }
    })
  }

  const setupChannelAsAHost = () => {
    try {
      const channelIns = peerConnection.current?.createDataChannel(CHANNEL_LABEL)

      channelInstance.current = channelIns
    } catch (e) {
      console.error('No data channel (peerConnection)', e)
    }
  }

  if (!peerConnection.current) return <div>No connection</div>

  const createAnswer = async (remoteDescription: string) => {
    const data = JSON.parse(remoteDescription)
    if (peerConnection.current?.remoteDescription && data.type === 'answer') return
    try {
      await peerConnection.current?.setRemoteDescription(new RTCSessionDescription(data))
    } catch (Error) {}
    if (
      peerConnection.current &&
      peerConnection.current?.connectionState === 'new' &&
      peerConnection.current.signalingState !== 'stable'
    ) {
      const description = await peerConnection.current.createAnswer()
      try {
        peerConnection.current.setLocalDescription(description as RTCLocalSessionDescriptionInit)
      } catch (e) {}
    }
  }

  const createOffer = async (peer: string, me: string) => {
    const description = await peerConnection.current?.createOffer()
    try {
      peerConnection.current?.setLocalDescription(description as RTCLocalSessionDescriptionInit)
    } catch (e) {}

    setupChannelAsAHost()
    if (peerConnection.current?.onsignalingstatechange === null)
      peerConnection.current.onsignalingstatechange = async () => {
        const description = await peerConnection.current?.createOffer()
        try {
          peerConnection.current?.setLocalDescription(description as RTCLocalSessionDescriptionInit)
        } catch (e) {}

        sendDataTo()
      }
    setTimeout(() => {
      const rm = toBase64(
        JSON.stringify(peerConnection.current?.localDescription?.toJSON())
      ).toString()
      socket?.send(
        JSON.stringify({
          play: peer,
          with: me,
          recievedRemoteDescr: rm,
        })
      )
    }, 100)
  }

  return (
    <ConnectionContext.Provider
      value={{
        chooseNickName,
        createOffer,
        shareSendMove,
        refNavigate,
        peers,
        socket,
        channelInstance,
      }}
    >
      {children}
    </ConnectionContext.Provider>
  )
}

export default ConnectionProvider
