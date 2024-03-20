import type { Model } from "../bime"
import type { RejectType, ResolveType } from "./createExposedPromise"

type ResolveData<RemoteModel extends Model> = ReturnType<
  RemoteModel[keyof RemoteModel]
>

type ExposedMessagePromise<RemoteModel extends Model> = {
  promise: Promise<ResolveData<RemoteModel>>
  resolve: ResolveType<ResolveData<RemoteModel>>
  reject: RejectType
}
type RequestMessage<RemoteModel extends Model> = {
  id: string
  type: "request"
  procedure: keyof RemoteModel
  args: Parameters<RemoteModel[keyof RemoteModel]>
}

export type SentMessageStore<RemoteModel extends Model> = Map<
  string,
  {
    message: RequestMessage<RemoteModel>
    acknowledged: boolean
    promise: ExposedMessagePromise<ReturnType<RemoteModel[keyof RemoteModel]>>
    remote: Window
  }
>

export type AutoRetryOptions = {
  timeout: number
  tries: number
  backoff: number
}
