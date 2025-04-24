import superjson from "superjson"
import { z } from "zod"
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

// TODO: couple this with types
export const responseMessageSchema = z.discriminatedUnion("type", [
  z.object({
    id: z.string().min(1),
    type: z.literal("response"),
    data: z.any(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("error"),
    error: z.instanceof(Error),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal("ack"),
  }),
])

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

    sender(superjson.stringify(message))

    return await promise
  }

  const messageHandler = (messageString: string) => {
    const message = superjson.parse(messageString)

    const { success, data } = responseMessageSchema.safeParse(message)

    if (!success) return

    const { id, type } = data

    switch (type) {
      case "ack":
        sentMessagesStore.acknowledge(id)
        break
      case "response":
        sentMessagesStore.resolve(
          id,
          data.data as ReturnType<Model[keyof Model]>,
        )
        break
      case "error":
        sentMessagesStore.reject(id, data.error)
        break
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
