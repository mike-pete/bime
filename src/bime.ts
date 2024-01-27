import { RejectType, ResolveType } from './createExposedPromise'
import { listenForMessages } from './messageHandler'
import messageSender from './messageSender'

export type Model = Record<string, (...args: any[]) => any>

type MessageResponse<RemoteModel> = {
	[K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
		? (...args: A) => Promise<R>
		: never
}

export type MessagesSent<RemoteModel extends Model> = Record<
	string,
	{
		resolve: ResolveType<ReturnType<RemoteModel[keyof RemoteModel]>>
		reject: RejectType
		acknowledged: boolean
	}
>

const bime = <RemoteModel extends Model>(target: Window, model:Model = {}) => {
	const sentMessages: MessagesSent<RemoteModel> = {}

	listenForMessages(model)

	const sendMessage = messageSender<RemoteModel>(sentMessages, target)

	const handler: ProxyHandler<MessageResponse<RemoteModel>> = {
		get: (target: MessageResponse<RemoteModel>, prop: string) => {
			return (...args: Parameters<RemoteModel[keyof RemoteModel]>) => {
				return sendMessage(prop, args)
			}
		},
	}

	return new Proxy<MessageResponse<RemoteModel>>({} as MessageResponse<RemoteModel>, handler)
}

export default bime
