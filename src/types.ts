import { ResolveType, RejectType } from './target/createExposedPromise'

export type Model = Record<string, (...args: any[]) => any>

export type ResponseMessage<T extends Model> = {
	id: string
	type: 'response'
	data: ReturnType<T[keyof T]> | 'acknowledged'
}

export type ErrorMessage = {
	id: string
	type: 'error'
	error: Error
}

export type AckMessage = {
	id: string
	type: 'ack'
}

export type RequestMessage<RemoteModel extends Model> = {
	id: string
	type: 'request'
	prop: keyof RemoteModel
	args: Parameters<RemoteModel[keyof RemoteModel]>
}

type ResolveData<RemoteModel extends Model> = {
	data: ReturnType<RemoteModel[keyof RemoteModel]>
	event: MessageEvent
}

type ExposedMessagePromise<RemoteModel extends Model> = {
	promise: Promise<ResolveData<RemoteModel>>
	resolve: ResolveType<ResolveData<RemoteModel>>
	reject: RejectType
}

export type SentMessageStore<RemoteModel extends Model> = Record<
	string,
	{
		message: RequestMessage<RemoteModel>
		acknowledged: boolean
		promise: ExposedMessagePromise<RemoteModel>
		target: Window
	}
>

export type AutoRetryOptions = { timeout: number; tries: number; backoff: number }
