import { Model, RequestMessage } from './types'
import { listenForMessages } from './messageHandler'
import { requestSender } from './messageSender'
import { SentMessageStore } from './types'

type MessageResponse<RemoteModel> = {
	[K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
		? (...args: A) => Promise<R>
		: never
}

const bime = <RemoteModel extends Model>(target: Window, model: Model = {}) => {
	const sentMessagesStore: SentMessageStore<RemoteModel> = {}

	listenForMessages<RemoteModel>(model, sentMessagesStore)

	const sendRequest = requestSender<RemoteModel>(sentMessagesStore, target)

	const handler: ProxyHandler<MessageResponse<RemoteModel>> = {
		get: (target: MessageResponse<RemoteModel>, prop: string) => {
			return (...args: Parameters<RemoteModel[keyof RemoteModel]>) => {
				return sendRequest({
					type: 'request',
					prop,
					args,
				})
			}
		},
	}

	return new Proxy<MessageResponse<RemoteModel>>({} as MessageResponse<RemoteModel>, handler)
}

export default bime
