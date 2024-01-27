import {
	AckMessage,
	ErrorMessage,
	RequestMessage,
	ResponseMessage,
	SentMessageStore,
} from './types'
import { Model } from './types'
import createExposedPromise, { RejectType } from './createExposedPromise'

export const requestSender = <RemoteModel extends Model>(
	sentMessages: SentMessageStore<RemoteModel>,
	target: Window
) => {
	const autoRetry = (id: string, reject: RejectType, tries: number = 3) => {
		// TODO: add exponential backoff
		// TODO: if tries are exceeded, reject with error
	}

	const saveMessageToStore = (message: RequestMessage<RemoteModel>) => {
		const exposedPromise = createExposedPromise<ReturnType<RemoteModel[keyof RemoteModel]>>()

		sentMessages[message.id] = {
			message,
			acknowledged: false,
			promise: exposedPromise,
		}

		return exposedPromise
	}

	const sendRequest = (messageData: Omit<RequestMessage<RemoteModel>, 'id'>) => {
		const message = { ...messageData, id: Math.random().toString(36).substring(7) }
		target.postMessage(message, '*')

		if (messageData.type === 'request') {
			const exposedPromise = saveMessageToStore(message as RequestMessage<RemoteModel>)
			autoRetry(message.id, exposedPromise.reject)
			return exposedPromise.promise
		}
	}

	return sendRequest
}

export const sendResponse = <LocalModel extends Model>(
	message: { id: string } & (AckMessage | ResponseMessage<LocalModel> | ErrorMessage),
	target: Window
) => {
	target.postMessage(message, '*')
}
