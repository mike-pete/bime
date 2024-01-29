import { AutoRetryOptions, RequestMessage, SentMessageStore } from '../types'
import { Model } from '../types'
import createExposedPromise, { RejectType } from './createExposedPromise'

const requestSender = <RemoteModel extends Model>(
	sentMessages: SentMessageStore<RemoteModel>,
	target: Window,
	options?: AutoRetryOptions
) => {
	const autoRetry = (
		id: string,
		reject: RejectType,
		options: AutoRetryOptions = {
			timeout: 30,
			tries: 3,
			backoff: 3,
		},
		startTime: number = Date.now()
	) => {
		const { timeout, tries, backoff } = options

		setTimeout(() => {
			const sentMessage = sentMessages[id]
			if (sentMessage.acknowledged) return

			if (tries > 0) {
				autoRetry(
					id,
					reject,
					{
						timeout: timeout * backoff,
						tries: tries - 1,
						backoff,
					},
					startTime
				)
				sendRequest(sentMessage.message)
			} else {
				const timeElapsed = Date.now() - startTime
				reject(`Message was not acknowledged after ${timeElapsed}ms.`)
			}
		}, timeout)
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

	const sendNewRequest = (messageData: Omit<RequestMessage<RemoteModel>, 'id'>) => {
		const message = { ...messageData, id: Math.random().toString(36).substring(7) }
		sendRequest(message)

		const exposedPromise = saveMessageToStore(message as RequestMessage<RemoteModel>)
		autoRetry(message.id, exposedPromise.reject, options)
		return exposedPromise.promise
	}

	const sendRequest = (message: RequestMessage<RemoteModel>) => {
		target.postMessage(message, '*')
	}

	return sendNewRequest
}

export default requestSender
