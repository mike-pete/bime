import { AckMessage, ErrorMessage, Model, ResponseMessage } from './types'

const invokeHandler = (/*origins,*/ model: Model) => {
	let cleanedUp = false

	if ('cleanup' in model) {
		console.warn('"cleanup" is a reserved property name and cannot be used on the model.')
	}
	const handler = messageHandler(model)
	window.addEventListener('message', handler)
	return {
		cleanup: () => {
			if (cleanedUp) {
				throw new Error('The listener has been cleaned up.')
			}
			cleanedUp = true
			window.removeEventListener('message', handler)
		},
	}
}

const messageHandler = (model: Model) => (event: MessageEvent) => {
	// TODO: is the origin in the whitelist?

	const id = event.data?.id
	if (!id) return

	const type = event.data?.type
	if (type !== 'request') return

	const { prop, args } = event.data

	if (!prop) return

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

export const sendResponse = <LocalModel extends Model>(
	message: AckMessage | ResponseMessage<LocalModel> | ErrorMessage,
	target: Window
) => {
	target.postMessage(message, '*')
}

export default invokeHandler
