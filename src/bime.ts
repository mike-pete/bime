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

type Target<RemoteModel extends Model> = {
	cleanup: () => void
} & MessageResponse<RemoteModel>

const target = <RemoteModel extends Model>(targetWindow: Window) => {
	const sentMessagesStore: SentMessageStore<RemoteModel> = {}
	const sendRequest = requestSender<RemoteModel>(sentMessagesStore, targetWindow)
	const cleanup = responseListener<RemoteModel>(sentMessagesStore)

	let cleanedUp = false

	const handler: ProxyHandler<MessageResponse<RemoteModel>> = {
		get: (target: MessageResponse<RemoteModel>, prop: string) => {
			if (prop === 'cleanup') {
				return () => {
					if (cleanedUp) {
						throw new Error('The response listener has been cleaned up.')
					}
					cleanup()
					cleanedUp = true
				}
			}
			return (...args: Parameters<RemoteModel[keyof RemoteModel]>) => {
				if (cleanedUp) {
					throw new Error('The response listener has been cleaned up.')
				}
				return sendRequest({
					type: 'request',
					prop,
					args,
				})
			}
		},
	}
	return new Proxy<Target<RemoteModel>>({} as Target<RemoteModel>, handler)
}

const bime = { listen: invokeHandler, target }

export default bime
