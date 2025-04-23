import type {
  InvocationMessage,
  MessageListenerWithCleanup,
  MessageSender,
  ModelType,
  SentMessageStore,
} from "../types"
import createExposedPromise from "../utils/createExposedPromise"

type MessageResponse<RemoteModel> = {
  [K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends Promise<any> ? R : Promise<R>
    : never
}

type Invoke<RemoteModel extends ModelType> = MessageResponse<RemoteModel> & {
  cleanup: () => void
}

export default function invoke<Model extends ModelType>({
  listener,
  sender,
}: {
  listener: MessageListenerWithCleanup
  sender: MessageSender
}) {
  const sentMessagesStore: SentMessageStore<Model> = new Map()

  let cleanedUp = false

  const invoke = async (
    procedure: keyof Model,
    ...args: Parameters<Model[keyof Model]>
  ) => {
    const messageId = crypto.randomUUID()
    const message: InvocationMessage<Model> = {
      id: messageId, // TODO: collision prevention
      type: "invocation",
      procedure,
      args,
    }

    const exposedPromise =
      createExposedPromise<ReturnType<Model[keyof Model]>>()

    sentMessagesStore.set(messageId, {
      acknowledged: false,
      promise: exposedPromise,
    })

    sender(JSON.stringify(message))

    return await exposedPromise.promise
  }

  const messageHandler = (messageString: string) => {
    console.log("message", messageString)
    const message = JSON.parse(messageString)
    const { id, type, data, error } = message ?? {}

    if (typeof id !== "string" || id.length === 0) return
    const sentMessage = sentMessagesStore.get(id)
    const { promise } = sentMessage ?? {}

    if (sentMessage !== undefined && promise !== undefined) {
      switch (type) {
        case "ack":
          sentMessagesStore.set(id, {
            promise,
            acknowledged: true,
          })
          break
        case "response":
          sentMessagesStore.set(id, {
            promise,
            acknowledged: true,
          })
          promise.resolve(data)
          break
        case "error":
          promise.reject(error)
          break
      }
    }
  }
  const listenerCleanup = listener(messageHandler)
  const cleanup = () => {
    cleanedUp = true
    listenerCleanup()
    sentMessagesStore.clear()
  }

  const proxyHandler: ProxyHandler<Invoke<Model>> = {
    get: (_, procedure: string) => {
      if (cleanedUp) {
        throw new Error("The response listener has been cleaned up.")
      } else if (procedure === "cleanup") {
        return cleanup
      } else {
        return async (...args: Parameters<Model[keyof Model]>) => {
          return await invoke(procedure, ...args)
        }
      }
    },
  }

  //   eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return new Proxy<Invoke<Model>>({} as Invoke<Model>, proxyHandler)
}
