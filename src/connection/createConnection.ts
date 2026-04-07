import superjson from 'superjson'
import type { Transport } from '../types'

type ConnectionOptions = {
  timeout?: number
  synInterval?: number
  retry?: {
    timeout?: number
    tries?: number
    backoff?: number
  }
}

type PendingMessage = {
  raw: string
  id: string
  acknowledged: boolean
  retryTimer: ReturnType<typeof setTimeout> | null
}

type ControlMessage =
  | { type: 'syn' }
  | { type: 'ack' }
  | { type: 'msg-ack'; id: string }

const DEFAULTS = {
  timeout: 3000,
  synInterval: 100,
  retry: {
    timeout: 30,
    tries: 3,
    backoff: 3,
  },
} as const

function hasType(value: unknown): value is { type: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    typeof (value as { type: unknown }).type === 'string'
  )
}

function hasId(value: unknown): value is { id: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    typeof (value as { id: unknown }).id === 'string'
  )
}

export function createConnection(
  transport: Transport,
  options?: ConnectionOptions,
): Transport & { cleanup: () => void } {
  const config = {
    timeout: options?.timeout ?? DEFAULTS.timeout,
    synInterval: options?.synInterval ?? DEFAULTS.synInterval,
    retry: {
      timeout: options?.retry?.timeout ?? DEFAULTS.retry.timeout,
      tries: options?.retry?.tries ?? DEFAULTS.retry.tries,
      backoff: options?.retry?.backoff ?? DEFAULTS.retry.backoff,
    },
  }

  let connected = false
  let cleanedUp = false
  const queue: string[] = []
  const pendingMessages = new Map<string, PendingMessage>()
  let incomingHandler: ((message: string) => void) | null = null

  // --- Handshake ---

  const synInterval = setInterval(() => {
    transport.sender(superjson.stringify({ type: 'syn' }))
  }, config.synInterval)

  const handshakeTimeout = setTimeout(() => {
    if (connected) return
    clearInterval(synInterval)
    for (const raw of queue) {
      rejectMessage(raw, 'Connection timed out')
    }
    queue.length = 0
  }, config.timeout)

  function onConnected() {
    if (connected) return
    connected = true
    clearInterval(synInterval)
    clearTimeout(handshakeTimeout)
    for (const raw of queue) {
      sendWithRetry(raw)
    }
    queue.length = 0
  }

  // --- Per-message ACK + retry ---

  function extractMessageId(raw: string): string | null {
    try {
      const parsed: unknown = superjson.parse(raw)
      if (hasId(parsed)) return parsed.id
    } catch {
      // not parseable — no id
    }
    return null
  }

  function sendWithRetry(raw: string) {
    const id = extractMessageId(raw)
    if (!id) {
      transport.sender(raw)
      return
    }

    const pending: PendingMessage = {
      raw,
      id,
      acknowledged: false,
      retryTimer: null,
    }
    pendingMessages.set(id, pending)
    transport.sender(raw)
    scheduleRetry(pending, config.retry.timeout, config.retry.tries)
  }

  function scheduleRetry(
    pending: PendingMessage,
    delay: number,
    triesLeft: number,
  ) {
    pending.retryTimer = setTimeout(() => {
      if (pending.acknowledged || cleanedUp) return

      if (triesLeft > 0) {
        transport.sender(pending.raw)
        scheduleRetry(pending, delay * config.retry.backoff, triesLeft - 1)
      } else {
        pendingMessages.delete(pending.id)
        rejectMessage(
          pending.raw,
          `Message was not acknowledged after ${config.retry.tries} retries`,
        )
      }
    }, delay)
  }

  function rejectMessage(raw: string, errorMessage: string) {
    const id = extractMessageId(raw)
    if (!id || !incomingHandler) return

    const errorResponse = superjson.stringify({
      id,
      type: 'error',
      error: new Error(errorMessage),
    })
    incomingHandler(errorResponse)
  }

  // --- Control plane message handling ---

  function isControlMessage(parsed: unknown): parsed is ControlMessage {
    if (!hasType(parsed)) return false
    return (
      parsed.type === 'syn' ||
      parsed.type === 'ack' ||
      parsed.type === 'msg-ack'
    )
  }

  function handleControlMessage(msg: ControlMessage) {
    switch (msg.type) {
      case 'syn':
        transport.sender(superjson.stringify({ type: 'ack' }))
        break
      case 'ack':
        onConnected()
        break
      case 'msg-ack': {
        const pending = pendingMessages.get(msg.id)
        if (pending) {
          pending.acknowledged = true
          if (pending.retryTimer) clearTimeout(pending.retryTimer)
          pendingMessages.delete(msg.id)
        }
        break
      }
    }
  }

  // --- Wrapped listener/sender ---

  const listenerCleanup = transport.listener((messageString: string) => {
    try {
      const parsed: unknown = superjson.parse(messageString)

      if (isControlMessage(parsed)) {
        handleControlMessage(parsed)
        return
      }

      // Send msg-ack for incoming data messages with an id
      if (hasId(parsed)) {
        transport.sender(
          superjson.stringify({ id: parsed.id, type: 'msg-ack' }),
        )
      }

      // Forward to the application handler
      incomingHandler?.(messageString)
    } catch {
      // Forward unparseable messages as-is (let the application layer handle them)
      incomingHandler?.(messageString)
    }
  })

  const listener: Transport['listener'] = (handler) => {
    incomingHandler = handler
    return () => {
      incomingHandler = null
    }
  }

  const sender: Transport['sender'] = (message) => {
    if (cleanedUp) return
    if (!connected) {
      queue.push(message)
      return
    }
    sendWithRetry(message)
  }

  const cleanup = () => {
    if (cleanedUp) return
    cleanedUp = true
    clearInterval(synInterval)
    clearTimeout(handshakeTimeout)

    for (const pending of pendingMessages.values()) {
      if (pending.retryTimer) clearTimeout(pending.retryTimer)
    }
    pendingMessages.clear()

    for (const raw of queue) {
      rejectMessage(raw, 'Connection was cleaned up')
    }
    queue.length = 0

    listenerCleanup()
    transport.cleanup?.()
  }

  return { listener, sender, cleanup }
}
