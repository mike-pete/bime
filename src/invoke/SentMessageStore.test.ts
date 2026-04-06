import { beforeEach, describe, expect, test } from 'bun:test'
import SentMessageStore from './SentMessageStore'

describe('SentMessageStore', () => {
  let store: SentMessageStore

  beforeEach(() => {
    store = new SentMessageStore()
  })

  describe('add', () => {
    test('should add a new message with a unique ID', () => {
      const { id, promise } = store.add()

      expect(id).toBeDefined()
      expect(typeof id).toBe('string')
      expect(promise).toBeInstanceOf(Promise)
    })

    test('should generate unique IDs for multiple messages', () => {
      const { id: id1 } = store.add()
      const { id: id2 } = store.add()

      expect(id1).not.toBe(id2)
    })
  })

  describe('resolve', () => {
    test('should resolve the promise with the given data', async () => {
      const { id, promise } = store.add()
      store.resolve(id, 42)
      await expect(promise).resolves.toBe(42)
    })

    test('should do nothing for non-existent message ID', () => {
      expect(() => {
        store.resolve('non-existent-id', 42)
      }).not.toThrow()
    })
  })

  describe('reject', () => {
    test('should reject the promise with the given error', async () => {
      const { id, promise } = store.add()
      const testError = new Error('Test error')
      store.reject(id, testError)
      await expect(promise).rejects.toThrow(testError)
    })

    test('should do nothing for non-existent message ID', () => {
      expect(() => {
        store.reject('non-existent-id', new Error('Test error'))
      }).not.toThrow()
    })
  })

  describe('clear', () => {
    test('should reject pending promises when cleared', async () => {
      const { promise } = store.add()
      store.clear()
      await expect(promise).rejects.toThrow('Store was cleared')
    })

    test('should no-op resolve after clear', () => {
      const { id, promise } = store.add()
      // catch the rejection from clear so it doesn't throw
      promise.catch(() => undefined)
      store.clear()

      expect(() => {
        store.resolve(id, 42)
      }).not.toThrow()
    })
  })
})
