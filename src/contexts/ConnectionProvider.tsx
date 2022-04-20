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
    nameRef.current = name
    return name
  }

  useEffect(() => {
    if (!socket) {
      try {
        // const sock = new WebSocket(`ws://chess-login.danek-family.cz:80/websockets`)
        const sock = new WebSocket(`wss://chess-login.danek-family.cz:443/websockets`)
        // const sock = new WebSocket(`ws://chess-login.danek-family.cz:9000/websockets`)
        // const sock = new WebSocket(`ws://localhost:9000/websockets`)
        sock.addEventListener('open', event => {
          sock.send(JSON.stringify({ peers: 'All' }))
          sock.send(JSON.stringify({ check: 'wss' }))
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

  // if (peerConnection.current?.oniceconnectionstatechange === null)
  //   peerConnection.current.oniceconnectionstatechange = ev => {
  //     console.info('iceConnectionState: ', peerConnection.current?.iceConnectionState)
  //   }

  const sendDataToWithTimeout = useCallback(() => {
    if (peerConnection.current?.connectionState !== 'connected') {
      setTimeout(() => {
        const rm = JSON.stringify(peerConnection.current?.localDescription?.toJSON())
        socket?.send(
          JSON.stringify({
            sendTo: sendTo.current,
            sentBy: nameRef.current,
            recievedRemoteDescr: toBase64(rm),
          })
        )
        // socket?.send(JSON.stringify({ connected: nameRef.current }))
      }, 100)
    }
  }, [socket])

  const sendDataNoTimeout = useCallback(() => {
    if (peerConnection.current?.connectionState !== 'connected') {
      const rm = JSON.stringify(peerConnection.current?.localDescription?.toJSON())
      if (!rm) return
      socket?.send(
        JSON.stringify({
          sendTo: sendTo.current,
          sentBy: nameRef.current,
          recievedRemoteDescr: toBase64(rm),
        })
      )
      // socket?.send(JSON.stringify({ connected: nameRef.current }))
    }
  }, [socket])

  const createAnswer = useCallback(async (remoteDescription: string) => {
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
        peerConnection.current.connectionState !== 'new' ||
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
      console.info('create answer error')
    }
  }, [])

  const connect = useCallback(() => {
    if (peerConnection.current?.ondatachannel === null) setupChannelAsASlave()
    if (peerConnection.current?.onsignalingstatechange !== null) return
    peerConnection.current.onsignalingstatechange = () => {
      sendDataNoTimeout()
    }
  }, [sendDataNoTimeout, setupChannelAsASlave])

  // Listen for messages
  useEffect(() => {
    if (!socket) return
    if (socket.onmessage === null) {
      socket.onmessage = event => {
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
          if (peers && peers.length > 0) setPeers([...peers, ...added])
          else setPeers(added)
        } else {
          const value: Record<string, string> = JSON.parse(event.data)
          if (Object.keys(value).includes('recievedRemoteDescr')) {
            const prd = value['recievedRemoteDescr']
            if (Object.keys(value).includes('offeredBy')) {
              sendTo.current = value['offeredBy']
              if (prd) connect()
            } else if (Object.keys(value).includes('acceptedBy')) {
              sendTo.current = value['acceptedBy']
              if (prd) {
                createAnswer(fromBase64(prd))
              }
            }
          }
        }
      }
    }
  }, [createAnswer, connect, socket, peers])

  const stateChange = () => {
    // console.info('connection state chancged to: ', peerConnection.current?.connectionState)
    if (peerConnection.current?.connectionState === 'connected') {
      socket?.close()
      if (refNavigate) refNavigate.current!('/connect')
    }
  }

  if (!peerConnection.current) {
    peerConnection.current = new RTCPeerConnection({
      iceServers: [
        // {
        //   urls: 'stun:stun.services.mozilla.com',
        //   username: 'louis@mozilla.com',
        //   credential: 'webrtcdemo',
        // },
        { urls: 'stun:stun.l.google.com:19302' },
      ],
    })
    if (peerConnection.current.onconnectionstatechange === null)
      peerConnection.current.onconnectionstatechange = () => stateChange()
    // peerConnection.current.removeEventListener('connectionstatechange', stateChange)
    // peerConnection.current.addEventListener('connectionstatechange', stateChange)
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

  const createOffer = async (peer: string, me: string) => {
    if (peerConnection.current?.onsignalingstatechange === null)
      peerConnection.current.onsignalingstatechange = async () => {
        const description = await peerConnection.current?.createOffer()
        // if (
        //   ['have-remote-offer', 'have-local-pranswer'].includes(
        //     peerConnection.current?.signalingState!
        //   )
        // )
        //   return

        // sendDataToWithTimeout()
        if (description === undefined) return
        try {
          await peerConnection.current?.setLocalDescription(
            description as RTCLocalSessionDescriptionInit
          )
        } catch (e) {
          console.info('create offer error')
        }
      }
    const description = await peerConnection.current?.createOffer()
    // if (
    //   ['have-remote-offer', 'have-local-pranswer'].includes(peerConnection.current?.signalingState!)
    // )
    //   return
    setupChannelAsAHost()

    try {
      await peerConnection.current?.setLocalDescription(
        description as RTCLocalSessionDescriptionInit
      )
    } catch (e) {
      console.info('create peerConnection error')
    }

    sendTo.current = peer
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
    sendDataToWithTimeout()
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
