import createExposedPromise, {
  type RejectType,
  type ResolveType,
} from '../utils/createExposedPromise'

type ExposedMessagePromise = {
  promise: Promise<unknown>
  resolve: ResolveType<unknown>
  reject: RejectType
}

export default class SentMessageStore {
  readonly #store = new Map<string, ExposedMessagePromise>()

  add(): { id: string; promise: Promise<unknown> } {
    const id = this.#createMessageId()
    const exposedPromise = createExposedPromise<unknown>()
    this.#store.set(id, exposedPromise)
    return { id, promise: exposedPromise.promise }
  }

  #createMessageId(): string {
    let id = crypto.randomUUID()
    while (this.#store.has(id)) {
      id = crypto.randomUUID()
    }
    return id
  }

  resolve(id: string, data: unknown): void {
    const promise = this.#store.get(id)
    if (promise === undefined) return
    this.#store.delete(id)
    promise.resolve(data)
  }

  reject(id: string, error: Error): void {
    const promise = this.#store.get(id)
    if (promise === undefined) return
    this.#store.delete(id)
    promise.reject(error)
  }

  clear(): void {
    const pending = [...this.#store.values()]
    this.#store.clear()
    for (const promise of pending) {
      promise.reject(new Error('Store was cleared'))
    }
  }
}
