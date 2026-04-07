import type { Transport } from '../types'

export function iframeTransport({
  target,
  origin,
}: {
  target: Window | HTMLIFrameElement
  origin: string
}): Transport {
  const targetWindow =
    target instanceof HTMLIFrameElement ? target.contentWindow : target

  if (!targetWindow) {
    throw new Error('iframe contentWindow is not available')
  }

  const listener: Transport['listener'] = (handler) => {
    const cb = (event: MessageEvent) => {
      if (event.origin !== origin) return
      if (typeof event.data !== 'string') return
      handler(event.data)
    }
    window.addEventListener('message', cb)
    return () => window.removeEventListener('message', cb)
  }

  const sender: Transport['sender'] = (message) => {
    targetWindow.postMessage(message, origin)
  }

  return { listener, sender }
}
