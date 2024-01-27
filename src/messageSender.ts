import {
	AckMessage,
	ErrorMessage,
	RequestMessage,
	ResponseMessage,
	SentMessageStore,
} from './types'
import { Model } from './types'
import createExposedPromise, { RejectType } from './createExposedPromise'

const messageSender = <RemoteModel extends Model, LocalModel extends Model>(
	sentMessages: SentMessageStore<RemoteModel>,
	target: Window
) => {
	const autoRetry = (id: string, reject: RejectType, tries: number = 3) => {
		// TODO: add exponential backoff
		// TODO: if tries are exceeded, reject with error
	}

	const saveMessageToStore = (message: RequestMessage<RemoteModel>) => {
		const exposedPromise = createExposedPromise<ReturnType<RemoteModel[keyof RemoteModel]>>()
		const id = Math.random().toString(36).substring(7)

		sentMessages[id] = {
			message,
			acknowledged: false,
			promise: exposedPromise,
		}

		return { exposedPromise, id }
	}

	const sendMessage = (
		messageData:
			| RequestMessage<RemoteModel>
			| AckMessage
			| ResponseMessage<LocalModel>
			| ErrorMessage
	) => {
		target.postMessage(messageData, '*')

		if (messageData.type === 'request') {
			const { exposedPromise, id } = saveMessageToStore(messageData as RequestMessage<RemoteModel>)
			autoRetry(id, exposedPromise.reject)
			return exposedPromise.promise
		}
	}

	return sendMessage
}

export default messageSender
