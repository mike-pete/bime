import { describe, expect, jest, test } from 'bun:test'
import { EventEmitter } from 'node:events'
import { invoke, listen } from '../bime'
import type { Transport } from '../types'
import { createConnection } from './createConnection'

/**
 * Creates a pair of transports that simulate two sides communicating.
 * Side A sends → Side B receives, and vice versa.
 */
function createTransportPair(): { a: Transport; b: Transport } {
  const emitter = new EventEmitter()
  const channelAtoB = crypto.randomUUID()
  const channelBtoA = crypto.randomUUID()

  const a: Transport = {
    listener: (handler) => {
      emitter.on(channelBtoA, handler)
      return () => emitter.off(channelBtoA, handler)
    },
    sender: (message) => emitter.emit(channelAtoB, message),
  }

  const b: Transport = {
    listener: (handler) => {
      emitter.on(channelAtoB, handler)
      return () => emitter.off(channelAtoB, handler)
    },
    sender: (message) => emitter.emit(channelBtoA, message),
  }

  return { a, b }
}

describe('createConnection', () => {
  describe('handshake', () => {
    test('establishes connection and flushes queued messages', async () => {
      const { a, b } = createTransportPair()

      const connA = createConnection(a, { synInterval: 10 })
      // Queue a call before listen side is up
      const model = { greet: (name: string) => `Hello ${name}` }

      const api = invoke<typeof model>(connA)

      // Start listen side with connection after a short delay
      setTimeout(() => {
        const connB = createConnection(b, { synInterval: 10 })
        listen({ model, ...connB })
      }, 50)

      // This should queue and then resolve after handshake
      const result = await api.greet('World')
      expect(result).toEqual('Hello World')
      connA.cleanup()
    })

    test('both sides connect when started simultaneously', async () => {
      const { a, b } = createTransportPair()

      const connA = createConnection(a, { synInterval: 10 })
      const connB = createConnection(b, { synInterval: 10 })

      const model = { sum: (a: number, b: number) => a + b }
      listen({ model, ...connB })
      const api = invoke<typeof model>(connA)

      expect(await api.sum(1, 2)).toEqual(3)
      connA.cleanup()
      connB.cleanup()
    })

    test('timeout rejects queued calls', async () => {
      const { a } = createTransportPair()

      // No listen side — handshake will time out
      const conn = createConnection(a, { timeout: 50, synInterval: 10 })
      const model = { greet: (name: string) => `Hello ${name}` }
      const api = invoke<typeof model>(conn)

      await expect(api.greet('World')).rejects.toThrow('Connection timed out')
      conn.cleanup()
    })

    test('configurable SYN interval', async () => {
      const { a, b } = createTransportPair()
      const senderSpy = jest.fn(a.sender)
      const spiedA: Transport = { ...a, sender: senderSpy }

      const conn = createConnection(spiedA, { synInterval: 20 })

      // Wait for a few SYN messages
      await new Promise((r) => setTimeout(r, 70))

      // Should have sent multiple SYNs
      expect(senderSpy.mock.calls.length).toBeGreaterThanOrEqual(2)
      conn.cleanup()

      // Connect the other side to avoid dangling
      const connB = createConnection(b, { synInterval: 10 })
      connB.cleanup()
    })
  })

  describe('message ACKs and retry', () => {
    test('retries unacknowledged messages', async () => {
      const { a, b } = createTransportPair()

      const connA = createConnection(a, {
        synInterval: 10,
        retry: { timeout: 20, tries: 3, backoff: 1 },
      })
      const connB = createConnection(b, { synInterval: 10 })

      const callCount = jest.fn()
      const model = {
        greet: (name: string) => {
          callCount()
          return `Hello ${name}`
        },
      }

      listen({ model, ...connB })
      const api = invoke<typeof model>(connA)

      const result = await api.greet('World')
      expect(result).toEqual('Hello World')

      connA.cleanup()
      connB.cleanup()
    })

    test('rejects after max retries exhausted', async () => {
      const { a, b } = createTransportPair()

      // After handshake, drop ALL messages from B→A (responses + msg-acks)
      let dropAll = false
      const filteredA: Transport = {
        listener: (handler) => {
          return a.listener((msg) => {
            if (dropAll) return
            handler(msg)
          })
        },
        sender: a.sender,
      }

      const connA = createConnection(filteredA, {
        synInterval: 10,
        retry: { timeout: 10, tries: 2, backoff: 1 },
      })
      const connB = createConnection(b, { synInterval: 10 })

      const model = { greet: (name: string) => `Hello ${name}` }
      listen({ model, ...connB })
      const api = invoke<typeof model>(connA)

      // Wait for handshake
      await new Promise((r) => setTimeout(r, 50))

      // Now drop everything from B→A
      dropAll = true

      await expect(api.greet('World')).rejects.toThrow(
        'Message was not acknowledged after 2 retries',
      )

      connA.cleanup()
      connB.cleanup()
    })
  })

  describe('cleanup', () => {
    test('cleanup chains to transport cleanup', () => {
      const { a } = createTransportPair()
      const transportCleanup = jest.fn()
      const transportWithCleanup: Transport = {
        ...a,
        cleanup: transportCleanup,
      }

      const conn = createConnection(transportWithCleanup, { synInterval: 10 })
      conn.cleanup()

      expect(transportCleanup).toHaveBeenCalled()
    })

    test('invoke cleanup chains through connection to transport', () => {
      const { a, b } = createTransportPair()
      const transportCleanup = jest.fn()
      const transportWithCleanup: Transport = {
        ...a,
        cleanup: transportCleanup,
      }

      const conn = createConnection(transportWithCleanup, { synInterval: 10 })
      const model = { greet: (name: string) => `Hello ${name}` }
      const api = invoke<typeof model>(conn)

      api.cleanup()

      expect(transportCleanup).toHaveBeenCalled()

      const connB = createConnection(b, { synInterval: 10 })
      connB.cleanup()
    })

    test('cleanup rejects queued messages', async () => {
      const { a } = createTransportPair()

      const conn = createConnection(a, { timeout: 5000, synInterval: 10 })
      const model = { greet: (name: string) => `Hello ${name}` }
      const api = invoke<typeof model>(conn)

      const promise = api.greet('World')

      // Cleanup before handshake completes
      await new Promise((r) => setTimeout(r, 20))
      conn.cleanup()

      await expect(promise).rejects.toThrow()
    })
  })

  describe('integration with bime', () => {
    test('full stack: transport → connection → invoke/listen', async () => {
      const { a, b } = createTransportPair()

      const connA = createConnection(a, { synInterval: 10 })
      const connB = createConnection(b, { synInterval: 10 })

      const model = {
        greet: (name: string) => `Hello ${name}`,
        sum: (a: number, b: number) => a + b,
        async fetchData(id: string) {
          return { id, value: 42 }
        },
        willThrow() {
          throw new Error('test error')
        },
      }

      listen({ model, ...connB })
      const api = invoke<typeof model>(connA)

      expect(await api.greet('World')).toEqual('Hello World')
      expect(await api.sum(1, 2)).toEqual(3)
      expect(await api.fetchData('abc')).toEqual({ id: 'abc', value: 42 })
      await expect(api.willThrow()).rejects.toThrow('test error')

      connA.cleanup()
      connB.cleanup()
    })

    test('concurrent calls through connection layer', async () => {
      const { a, b } = createTransportPair()

      const connA = createConnection(a, { synInterval: 10 })
      const connB = createConnection(b, { synInterval: 10 })

      const model = {
        double: (n: number) => n * 2,
        greet: (name: string) => `Hi ${name}`,
      }

      listen({ model, ...connB })
      const api = invoke<typeof model>(connA)

      const [x, y, z, w] = await Promise.all([
        api.double(5),
        api.greet('Alice'),
        api.double(10),
        api.greet('Bob'),
      ])

      expect(x).toEqual(10)
      expect(y).toEqual('Hi Alice')
      expect(z).toEqual(20)
      expect(w).toEqual('Hi Bob')

      connA.cleanup()
      connB.cleanup()
    })
  })
})
