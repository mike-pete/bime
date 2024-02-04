import type { Model } from "../bime"
import requestSender from "./requestSender"
import responseListener from "./responseListener"
import type { AutoRetryOptions, SentMessageStore } from "./types"

type MessageResponse<RemoteModel> = {
  [K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends Promise<any> ? R : Promise<R>
    : never
}

type Target<RemoteModel extends Model> = MessageResponse<RemoteModel> & {
  cleanup: () => void
}

const target = <RemoteModel extends Model>(
  target: Window,
  origin: string,
  options?: AutoRetryOptions,
) => {
  const sentMessagesStore: SentMessageStore<RemoteModel> = new Map()
  const sendRequest = requestSender<RemoteModel>(
    sentMessagesStore,
    target,
    origin,
    options,
  )
  const cleanup = responseListener<RemoteModel>(sentMessagesStore, origin)

  let cleanedUp = false

  const handler: ProxyHandler<Target<RemoteModel>> = {
    get: (_, prop: string) => {
      if (prop === "cleanup") {
        return () => {
          if (cleanedUp) {
            throw new Error("The response listener has been cleaned up.")
          }
          cleanup()
          cleanedUp = true
        }
      }
      return async (...args: Parameters<RemoteModel[keyof RemoteModel]>) => {
        if (cleanedUp) {
          throw new Error("The response listener has been cleaned up.")
        }
        return await sendRequest({
          type: "request",
          prop,
          args,
        })
      }
    },
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return new Proxy<Target<RemoteModel>>({} as Target<RemoteModel>, handler)
}

export default target
