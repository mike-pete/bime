import { sendResponse } from './messageSender'
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
		
		// TODO: is the origin in the whitelist?
		
		if (type === 'response' || type === 'error' || type === 'ack') {
			// TODO: does the reply window match the target window?

			const sentMessage = sentMessagesStore[id]
			if (!sentMessage) return
		}

		
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
		const error = new ReferenceError(`Property "${prop}" does not exist on model`)
		sendResponse({ id: event.data.id, type: 'error', error }, event.source as Window)
		return
	}

	try {
		const result = model[prop](...args)
		sendResponse({ id: event.data.id, type: 'response', data: result }, event.source as Window)
	} catch (error) {
		sendResponse({ id: event.data.id, type: 'error', error: error }, event.source as Window)
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
) => {}
