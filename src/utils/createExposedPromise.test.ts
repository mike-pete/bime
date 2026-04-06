import { expect, test } from 'bun:test'
import createExposedPromise from './createExposedPromise'

test('should resolve with a value', async () => {
  const { promise, resolve } = createExposedPromise<string>()
  resolve('test')
  await expect(promise).resolves.toBe('test')
})

test('should reject with an error', async () => {
  const { promise, reject } = createExposedPromise<string>()
  const error = new Error('test error')
  reject(error)
  await expect(promise).rejects.toThrow('test error')
})

test('should handle PromiseLike values', async () => {
  const { promise, resolve } = createExposedPromise<string>()
  resolve(Promise.resolve('test'))
  await expect(promise).resolves.toBe('test')
})

test('should handle multiple resolutions', async () => {
  const { promise, resolve } = createExposedPromise<string>()
  resolve('first')
  resolve('second') // Should be ignored
  await expect(promise).resolves.toBe('first')
})

test('should handle multiple rejections', async () => {
  const { promise, reject } = createExposedPromise<string>()
  reject(new Error('first'))
  reject(new Error('second')) // Should be ignored
  await expect(promise).rejects.toThrow('first')
})

test('should handle undefined rejection reason', async () => {
  const { promise, reject } = createExposedPromise<string>()
  reject()
  await expect(promise).rejects.toThrow()
})
