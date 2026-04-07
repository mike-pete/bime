import superjson from 'superjson'
import { z } from 'zod'
import type { Transport } from '../types'
import SentMessageStore from './SentMessageStore'

type MessageResponse<RemoteModel> = {
  [K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends Promise<unknown> ? R : Promise<R>
    : never
}

type Invoke<RemoteModel extends Record<string, (...args: any[]) => any>> =
  MessageResponse<RemoteModel> & {
    cleanup: () => void
  }

const responseMessageSchema = z.discriminatedUnion('type', [
  z.object({
    id: z.string().min(1),
    type: z.literal('response'),
    data: z.unknown(),
  }),
  z.object({
    id: z.string().min(1),
    type: z.literal('error'),
    error: z.instanceof(Error),
  }),
])

export default function invoke<
  Model extends Record<string, (...args: any[]) => any>,
>(transport: Transport): Invoke<Model> {
  const { listener, sender, cleanup: transportCleanup } = transport
  const sentMessagesStore = new SentMessageStore()

  let cleanedUp = false

  const sendInvocation = async (
    procedure: string,
    args: unknown[],
  ): Promise<unknown> => {
    const { id, promise } = sentMessagesStore.add()

    const message = {
      id,
      type: 'invocation' as const,
      procedure,
      args,
    }

    sender(superjson.stringify(message))

    return await promise
  }

  const messageHandler = (messageString: string): void => {
    const message: unknown = superjson.parse(messageString)

    const { success, data } = responseMessageSchema.safeParse(message)

    if (!success) return

    switch (data.type) {
      case 'response':
        sentMessagesStore.resolve(data.id, data.data)
        break
      case 'error':
        sentMessagesStore.reject(data.id, data.error)
        break
    }
  }

  const listenerCleanup = listener(messageHandler)
  const cleanup = (): void => {
    if (cleanedUp) {
      throw new Error('cleanup() has already been called.')
    }
    cleanedUp = true
    listenerCleanup()
    sentMessagesStore.clear()
    transportCleanup?.()
  }

  const proxyHandler: ProxyHandler<object> = {
    get: (_, procedure: string | symbol) => {
      if (procedure === 'cleanup') {
        return cleanup
      } else if (typeof procedure === 'string') {
        return async (...args: unknown[]) => {
          if (cleanedUp) {
            throw new Error('The response listener has been cleaned up.')
          }
          return await sendInvocation(procedure, args)
        }
      }
      return undefined
    },
  }

  return new Proxy({}, proxyHandler) as Invoke<Model>
}
