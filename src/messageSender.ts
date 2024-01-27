import { SentMessageStore } from './types'
import { Model } from './types'
import createExposedPromise from './createExposedPromise'

// TODO: outgoing message queue
// should be a map of destination: message[]

// TODO: send messages differently if they are a response vs request
// const sendResponse = <LocalModel extends Model>(message: Message<LocalModel>) => {}

// const sendRequest = <RemoteModel extends Model>() => {}

const messageSender =
	<RemoteModel extends Model>(sentMessages: SentMessageStore<RemoteModel>, target: Window) =>
	(prop: string, args: Parameters<RemoteModel[keyof RemoteModel]>) => {
		const { promise, resolve, reject } =
			createExposedPromise<ReturnType<RemoteModel[keyof RemoteModel]>>()
		const id = Math.random().toString(36).substring(7)
		sentMessages[id] = { resolve, reject, acknowledged: false }
		target.postMessage({ prop, args }, '*')
		return promise
	}

export default messageSender
