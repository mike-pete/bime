import { beforeEach, describe, expect, test } from "bun:test"
import SentMessageStore from "./SentMessageStore"

// Define a simple model type for testing
type TestModel = {
  add: (a: number, b: number) => number
  greet: (name: string) => string
}

describe("SentMessageStore", () => {
  let store: SentMessageStore<TestModel>

  beforeEach(() => {
    store = new SentMessageStore<TestModel>()
  })

  describe("add", () => {
    test("should add a new message with a unique ID", () => {
      const { id, promise } = store.add()

      expect(id).toBeDefined()
      expect(typeof id).toBe("string")
      expect(promise).toBeInstanceOf(Promise)
    })

    test("should generate unique IDs for multiple messages", () => {
      const { id: id1 } = store.add()
      const { id: id2 } = store.add()

      expect(id1).not.toBe(id2)
    })
  })

  describe("acknowledge", () => {
    test("should mark a message as acknowledged", () => {
      const { id } = store.add()
      expect(store.isAcknowledged(id)).toBe(false)
      store.acknowledge(id)
      expect(store.isAcknowledged(id)).toBe(true)
    })

    test("should do nothing for non-existent message ID", () => {
      expect(() => {
        store.acknowledge("non-existent-id")
      }).not.toThrow()

      expect(store.isAcknowledged("non-existent-id")).toBe(false)
    })
  })

  describe("resolve", () => {
    test("should resolve the promise with the given data", async () => {
      const { id, promise } = store.add()
      const testData = 42

      store.resolve(id, testData)
      expect(promise).resolves.toBe(testData)
    })

    test("should acknowledge the message when resolving", async () => {
      const { id, promise } = store.add()

      store.resolve(id, 42)
      expect(promise).resolves.toBe(42)
      expect(store.isAcknowledged(id)).toBe(true)
    })

    test("should do nothing for non-existent message ID", () => {
      expect(() => {
        store.resolve("non-existent-id", 42)
      }).not.toThrow()
    })
  })

  describe("reject", () => {
    test("should reject the promise with the given error", async () => {
      const { id, promise } = store.add()
      const testError = new Error("Test error")

      store.reject(id, testError)
      expect(promise).rejects.toThrow(testError)
    })

    test("should acknowledge the message when rejecting", async () => {
      const { id, promise } = store.add()
      store.reject(id, new Error("Test error"))
      expect(promise).rejects.toThrow("Test error")
      expect(store.isAcknowledged(id)).toBe(true)
    })

    test("should do nothing for non-existent message ID", () => {
      expect(() => {
        store.reject("non-existent-id", new Error("Test error"))
      }).not.toThrow()
    })
  })

  describe("clear", () => {
    test("should clear all messages from the store", () => {
      const { id } = store.add()
      store.acknowledge(id)
      store.clear()

      expect(() => {
        store.resolve(id, 42)
      }).not.toThrow()
      expect(store.isAcknowledged(id)).toBe(false)
    })
  })
})
