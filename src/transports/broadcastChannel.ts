import type { Transport } from '../types'

export function broadcastChannelTransport(
  channel: BroadcastChannel,
): Transport {
  const listener: Transport['listener'] = (handler) => {
    const cb = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      handler(event.data)
    }
    channel.addEventListener('message', cb)
    return () => channel.removeEventListener('message', cb)
  }

  const sender: Transport['sender'] = (message) => {
    channel.postMessage(message)
  }

  return { listener, sender }
}
