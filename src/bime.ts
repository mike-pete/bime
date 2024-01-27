import { Model } from './types'
import { listenForMessages } from './messageHandler'
import messageSender from './messageSender'
import { SentMessageStore } from './types'

type MessageResponse<RemoteModel> = {
	[K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
		? (...args: A) => Promise<R>
		: never
}

const bime = <RemoteModel extends Model>(target: Window, model: Model = {}) => {

	const sentMessagesStore: SentMessageStore<RemoteModel> = {}

	listenForMessages(model)

	const sendMessage = messageSender<RemoteModel>(sentMessagesStore, target)

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
