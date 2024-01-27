import { ResolveType, RejectType } from './createExposedPromise'

export type Model = Record<string, (...args: any[]) => any>

export type ResponseMessage<T extends Model> = {
	type: 'response'
	data: ReturnType<T[keyof T]> | 'acknowledged'
}

export type ErrorMessage = {
	type: 'error'
	error: Error
}

export type AckMessage = {
	type: 'response'
}

export type RequestMessage<RemoteModel extends Model> = {
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
	}
>
