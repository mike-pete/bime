import { type ModelType } from "../types"

import createExposedPromise, {
  type RejectType,
  type ResolveType,
} from "../utils/createExposedPromise"

type ResolveData<Model extends ModelType> = ReturnType<Model[keyof Model]>

type ExposedMessagePromise<Model extends ModelType> = {
  promise: Promise<ResolveData<Model>>
  resolve: ResolveType<ResolveData<Model>>
  reject: RejectType
}

type SentMessageStoreType<Model extends ModelType> = Map<
  string,
  {
    acknowledged: boolean
    promise: ExposedMessagePromise<ReturnType<Model[keyof Model]>>
  }
>

export default class SentMessageStore<Model extends ModelType> {
  readonly #store: SentMessageStoreType<Model> = new Map()

  add() {
    const id = this.#createMessageId()
    const exposedPromise =
      createExposedPromise<ReturnType<Model[keyof Model]>>()
    this.#store.set(id, {
      acknowledged: false,
      promise: exposedPromise,
    })

    return { id, promise: exposedPromise.promise }
  }

  #createMessageId() {
    let id = crypto.randomUUID()
    while (this.#store.has(id)) {
      id = crypto.randomUUID()
    }
    return id
  }

  acknowledge(id: string) {
    const message = this.#store.get(id)
    if (message === undefined) return
    this.#store.set(id, {
      ...message,
      acknowledged: true,
    })
  }

  resolve(id: string, data: ReturnType<Model[keyof Model]>) {
    const { promise } = this.#store.get(id) ?? {}
    if (promise === undefined) return
    this.acknowledge(id)
    promise.resolve(data)
  }

  reject(id: string, error: Error) {
    const { promise } = this.#store.get(id) ?? {}
    if (promise === undefined) return
    this.acknowledge(id)
    promise.reject(error)
  }

  isAcknowledged(id: string) {
    const message = this.#store.get(id)
    if (message === undefined) return false
    return message.acknowledged
  }

  clear() {
    this.#store.clear()
  }
}
