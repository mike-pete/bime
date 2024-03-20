import type { Model } from "../bime"
import requestSender from "./requestSender"
import responseListener from "./responseListener"
import type { AutoRetryOptions, SentMessageStore } from "./types"

type MessageResponse<RemoteModel> = {
  [K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends Promise<any> ? R : Promise<R>
    : never
}

type Remote<RemoteModel extends Model> = MessageResponse<RemoteModel> & {
  cleanup: () => void
}

const remote = <RemoteModel extends Model>(
  remote: Window,
  origin: string,
  options?: AutoRetryOptions,
) => {
  const sentMessagesStore: SentMessageStore<RemoteModel> = new Map()
  const sendRequest = requestSender<RemoteModel>(
    sentMessagesStore,
    remote,
    origin,
    options,
  )
  const cleanup = responseListener<RemoteModel>(sentMessagesStore, origin)

  let cleanedUp = false

  const handler: ProxyHandler<Remote<RemoteModel>> = {
    get: (_, procedure: string) => {
      if (procedure === "cleanup") {
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
          procedure,
          args,
        })
      }
    },
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return new Proxy<Remote<RemoteModel>>({} as Remote<RemoteModel>, handler)
}

export default remote
