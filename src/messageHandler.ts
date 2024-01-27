import { Model } from './types'

export const listenForMessages = (model: Model) => {
	window.addEventListener('message', messageHandler(model))
}

const messageHandler = (model: Model) => (event: MessageEvent) => {
	const { data } = event
	const { prop, args } = data

	// Do we trust the sender of this message?  (might be
	// different from what we originally opened, for example).
	// if (event.origin !== 'http://example.com') return
	if (!prop) return
	if (typeof prop !== 'string') return
	if (!(prop in model)) return

	const result = model[prop](...args)

	// TODO: send result back to sender

	console.log('incoming message:', event, event.data, model)
}
