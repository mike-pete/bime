import { Model, SentMessageStore } from '../types'

const responseListener = <RemoteModel extends Model>(
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {
	const handler = messageHandler<RemoteModel>(sentMessagesStore)
	window.addEventListener('message', handler)
	return () => window.removeEventListener('message', handler)
}

const messageHandler =
	<RemoteModel extends Model>(sentMessagesStore: SentMessageStore<RemoteModel>) =>
	(event: MessageEvent) => {
		// TODO: is the origin in the whitelist?

		const id = event.data?.id
		if (!id) return

		const type = event.data?.type
		if (type !== 'response' && type !== 'error' && type !== 'ack') return

		// TODO: does the reply window match the target window?

		const sentMessage = sentMessagesStore[id]
		if (!sentMessage) return

		switch (type) {
			// case 'request':
			// 	return handleRequest(event, model)
			case 'response':
				return handleResponse<RemoteModel>(event, sentMessagesStore)
			case 'error':
				return handleError<RemoteModel>(event, sentMessagesStore)
			case 'ack':
				return handleAck<RemoteModel>(event, sentMessagesStore)
			default:
				return
		}
	}

const handleResponse = <RemoteModel extends Model>(
	event: MessageEvent,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {
	const { id, data } = event.data
	const sentMessage = sentMessagesStore[id]
	sentMessage.promise.resolve({ data, event })
}

const handleError = <RemoteModel extends Model>(
	event: MessageEvent,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {
	const { id, error } = event.data
	const sentMessage = sentMessagesStore[id]
	sentMessage.promise.reject({ error, event })
}

const handleAck = <RemoteModel extends Model>(
	event: MessageEvent,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {
	const { id } = event.data
	const sentMessage = sentMessagesStore[id]
	sentMessage.acknowledged = true
}

export default responseListener
