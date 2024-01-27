import { Model, SentMessageStore } from './types'

export const listenForMessages = <RemoteModel extends Model>(
	model: Model,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {
	window.addEventListener('message', messageHandler<RemoteModel>(model, sentMessagesStore))
}

const messageHandler =
	<RemoteModel extends Model>(model: Model, sentMessagesStore: SentMessageStore<RemoteModel>) =>
	(event: MessageEvent) => {
		const type = event.data?.type
		const id = event.data?.id

		if (!id) return

		// TODO:
		// Do we trust the sender of this message?  (might be
		// different from what we originally opened, for example).
		// if (event.origin !== 'http://example.com') return

		switch (type) {
			case 'request':
				return handleRequest(event, model)
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

const handleRequest = (event: MessageEvent, model: Model) => {
	const { prop, args } = event.data

	if (!prop) return
	if (typeof prop !== 'string') return
	if (!(prop in model)) {
		// TODO: send response that is an error
	}

	const result = model[prop](...args)

	// TODO: send result back to sender

	console.log('incoming message:', event, event.data, model)
}

const handleResponse = <RemoteModel extends Model>(
	event: MessageEvent,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {}

const handleError = <RemoteModel extends Model>(
	event: MessageEvent,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {}

const handleAck = <RemoteModel extends Model>(
	event: MessageEvent,
	sentMessagesStore: SentMessageStore<RemoteModel>
) => {}
