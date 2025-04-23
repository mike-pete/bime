import { expect, test } from "bun:test"
import createExposedPromise from "./createExposedPromise"

test("should resolve with a value", async () => {
  const { promise, resolve } = createExposedPromise<string>()
  resolve("test")
  expect(promise).resolves.toBe("test")
})

test("should reject with an error", async () => {
  const { promise, reject } = createExposedPromise<string>()
  const error = new Error("test error")
  reject(error)
  expect(promise).rejects.toThrow("test error")
})

test("should handle PromiseLike values", async () => {
  const { promise, resolve } = createExposedPromise<string>()
  resolve(Promise.resolve("test"))
  expect(promise).resolves.toBe("test")
})

test("should handle multiple resolutions", async () => {
  const { promise, resolve } = createExposedPromise<string>()
  resolve("first")
  resolve("second") // Should be ignored
  expect(promise).resolves.toBe("first")
})

test("should handle multiple rejections", async () => {
  const { promise, reject } = createExposedPromise<string>()
  reject(new Error("first"))
  reject(new Error("second")) // Should be ignored
  expect(promise).rejects.toThrow("first")
})

test("should handle undefined rejection reason", async () => {
  const { promise, reject } = createExposedPromise<string>()
  reject()
  expect(promise).rejects.toThrow()
})
