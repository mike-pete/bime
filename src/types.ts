import { ResolveType, RejectType } from './createExposedPromise'

export type Model = Record<string, (...args: any[]) => any>

type ResponseData<T extends Model> = {
	type: 'response'
	id: string
	data: ReturnType<T[keyof T]> | 'acknowledged'
}

type ErrorData = {
	type: 'error'
	id: string
	error: Error
}

type AckData = {
	type: 'response'
	id: string
}

type RequestData<RemoteModel extends Model> = {
	type: 'request'
	id: string
	prop: keyof RemoteModel
    args: Parameters<RemoteModel[keyof RemoteModel]>
}

type LibContext = {
	lib: {
		library: string
		version: string
	}
}

export type MessageData<T extends Model> = LibContext &
	(RequestData<T> | AckData | ResponseData<T> | ErrorData)

type ResolveData<RemoteModel extends Model> = LibContext & {
	data: ReturnType<RemoteModel[keyof RemoteModel]>
	event: MessageEvent
}

type OutgoingMessage<RemoteModel extends Model> = {
	resolve: ResolveType<ResolveData<RemoteModel>>
	reject: RejectType
	acknowledged: boolean
}

export type SentMessageStore<RemoteModel extends Model> = Record<
	string,
	OutgoingMessage<RemoteModel>
>