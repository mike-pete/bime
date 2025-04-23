import type {
  InvocationMessage,
  MessageListenerWithCleanup,
  MessageSender,
  ModelType,
} from "../types"
import SentMessageStore from "./SentMessageStore"

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
  const sentMessagesStore = new SentMessageStore<Model>()

  let cleanedUp = false

  const invoke = async (
    procedure: keyof Model,
    ...args: Parameters<Model[keyof Model]>
  ) => {
    const { id, promise } = sentMessagesStore.add()

    const message: InvocationMessage<Model> = {
      id,
      type: "invocation",
      procedure,
      args,
    }

    sender(JSON.stringify(message))

    return await promise
  }

  const messageHandler = (messageString: string) => {
    const message = JSON.parse(messageString)
    const { id, type, data, error } = message

    if (typeof id !== "string" || id.length === 0) return

    switch (type) {
      case "ack":
        sentMessagesStore.acknowledge(id)
        break
      case "response":
        sentMessagesStore.resolve(id, data)
        break
      case "error":
        sentMessagesStore.reject(id, error)
        break
    }
  }
  const listenerCleanup = listener(messageHandler)
  const cleanup = () => {
    cleanedUp = true
    console.log("cleaning up")
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
