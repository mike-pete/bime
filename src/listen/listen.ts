import superjson from 'superjson'
import { z } from 'zod'
import type { MessageSender, Transport } from '../types'

const invocationMessageSchema = z.object({
  id: z.string().min(1),
  type: z.literal('invocation'),
  procedure: z.string().min(1),
  args: z.array(z.unknown()),
})

type OutgoingMessage =
  | { id: string; type: 'response'; data: unknown }
  | { id: string; type: 'error'; error: Error }

export default function listen<
  Model extends Record<string, (...args: any[]) => any>,
>({
  model,
  ...transport
}: {
  model: Model
} & Transport): { cleanup: () => void } {
  const { listener, sender, cleanup: transportCleanup } = transport
  let cleanedUp = false

  if ('cleanup' in model) {
    throw new ReferenceError(
      '"cleanup" is a reserved name and cannot be used on the model.',
    )
  }

  const handler = callHandler(model, sender)
  const listenerCleanup = listener(handler)

  return {
    cleanup: () => {
      if (cleanedUp) {
        throw new Error('The listener has been cleaned up.')
      }
      cleanedUp = true
      listenerCleanup()
      transportCleanup?.()
    },
  }
}

function toError(value: unknown): Error {
  if (value instanceof Error) return value
  if (typeof value === 'string') return new Error(value)
  try {
    return new Error(JSON.stringify(value))
  } catch {
    return new Error(`Non-serializable throw: ${typeof value}`)
  }
}

const callHandler =
  (model: Record<string, (...args: any[]) => any>, sender: MessageSender) =>
  (messageString: string): void => {
    const message: unknown = superjson.parse(messageString)

    const { success, data } = invocationMessageSchema.safeParse(message)

    if (!success) return
    const { id, procedure, args } = data

    const sendResponse = (message: OutgoingMessage): void => {
      sender(superjson.stringify(message))
    }

    const fn = model[procedure]
    if (typeof fn !== 'function') {
      const error = new ReferenceError(
        `"${String(procedure)}" is not a procedure on the model`,
      )
      sendResponse({ id, type: 'error', error })
      return
    }

    try {
      const invocationResult: unknown = fn(...args)

      if (invocationResult instanceof Promise) {
        invocationResult
          .then((data: unknown) => {
            sendResponse({ id, type: 'response', data })
          })
          .catch((error: unknown) => {
            sendResponse({ id, type: 'error', error: toError(error) })
          })
      } else {
        sendResponse({
          id,
          type: 'response',
          data: invocationResult,
        })
      }
    } catch (error) {
      sendResponse({ id, type: 'error', error: toError(error) })
    }
  }
