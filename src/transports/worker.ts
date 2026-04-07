import type { Transport } from '../types'

type MessageTarget = {
  postMessage(message: unknown): void
  addEventListener(
    type: 'message',
    listener: (event: MessageEvent) => void,
  ): void
  removeEventListener(
    type: 'message',
    listener: (event: MessageEvent) => void,
  ): void
}

export function workerTransport(worker: MessageTarget): Transport {
  const listener: Transport['listener'] = (handler) => {
    const cb = (event: MessageEvent) => {
      if (typeof event.data !== 'string') return
      handler(event.data)
    }
    worker.addEventListener('message', cb)
    return () => worker.removeEventListener('message', cb)
  }

  const sender: Transport['sender'] = (message) => {
    worker.postMessage(message)
  }

  return { listener, sender }
}
