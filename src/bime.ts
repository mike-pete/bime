import { Model } from './types'
import { requestSender } from './messageSender'
import { SentMessageStore } from './types'
import invokeHandler from './invokeHandler'
import responseListener from './responseListener'

type MessageResponse<RemoteModel> = {
	[K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
		? (...args: A) => Promise<R>
		: never
}

const target = <RemoteModel extends Model>(targetWindow: Window) => {

	const sentMessagesStore: SentMessageStore<RemoteModel> = {}
	const sendRequest = requestSender<RemoteModel>(sentMessagesStore, targetWindow)
	const cleanup = responseListener<RemoteModel>(sentMessagesStore)

	const handler: ProxyHandler<MessageResponse<RemoteModel>> = {
		get: (target: MessageResponse<RemoteModel>, prop: string) => {
			if (prop === 'cleanup') return cleanup
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

const bime = { listen: invokeHandler, target }

export default bime
