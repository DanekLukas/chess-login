export const getIp4OfIp6 = (ip6: string) => {
  const ip6Arr = ip6.split(':')
  ip6Arr[0] = ip6Arr[0].split(' ').pop() || ''
  ip6Arr[7] = ip6Arr[7].split(' ').shift() || ''
  const value = ip6Arr[6] + ip6Arr[7]

  /*eslint no-bitwise: ["error", { "allow": ["~", "&"] }],  */
  const ip_1 = ~parseInt(value.substring(0, 2), 16) & 0xff
  const ip_2 = ~parseInt(value.substring(2, 4), 16) & 0xff
  const ip_3 = ~parseInt(value.substring(4, 6), 16) & 0xff
  const ip_4 = ~parseInt(value.substring(6, 8), 16) & 0xff

  return ip_1 + '.' + ip_2 + '.' + ip_3 + '.' + ip_4
}

export const extractIpFromCandidate = (
  event: RTCPeerConnectionIceEvent,
  candidate: React.MutableRefObject<string | undefined>
) => {
  const empty = candidate.current === undefined
  candidate.current = event.candidate?.candidate
  const ip6Arr = event.candidate?.candidate.split(':')
  if (ip6Arr && ip6Arr.length === 9) {
    ip6Arr.shift()
    ip6Arr[0] = ip6Arr[0].split(' ').pop() || ''
    ip6Arr[7] = ip6Arr[7].split(' ').shift() || ''
    const ip6 = ip6Arr.join(':')
    const ip4 = getIp4OfIp6(ip6)
    console.info(ip6)
    console.info(ip4)
    candidate.current = candidate.current?.replace(ip6, ip4)
  }
}

export const replaceIp6by4InCandidate = (candidate: string) => {
  try {
    let parsed = candidate
    const ip6Arr = candidate.split(':')
    if (ip6Arr && ip6Arr.length === 9) {
      ip6Arr.shift()
      ip6Arr[0] = ip6Arr[0].split(' ').pop() || ''
      ip6Arr[7] = ip6Arr[7].split(' ').shift() || ''
      const ip6 = ip6Arr.join(':')
      const ip4 = getIp4OfIp6(ip6)
      console.info(ip6)
      console.info(ip4)
      parsed = candidate.replace(ip6, ip4)
    }
    const candidateInitDict: RTCIceCandidateInit = {
      candidate: parsed,
      sdpMLineIndex: 0,
      // sdpMid: '',
      // usernameFragment: '',
    }
    return new RTCIceCandidate(candidateInitDict)
  } catch (e: any) {
    console.error(JSON.stringify(e.message))
  }
}
