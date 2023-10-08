import { RequestType } from './enums'
import { Context, MessageIdentifier } from './types'

export function bimeThrowError(message: string) {
	throw new Error(`bime: ${message}`)
}
bimeThrowError.prototype = Error.prototype

export function bimeLogWarning(message: string) {
	console.warn(`bime: ${message}`)
}

export function bimeLogImpossibility(message: string) {
	console.error(`BIME LEVEL ERROR: ${message}`)
}

export function messageIsRequest({ requestType }: MessageIdentifier) {
	return requestType === RequestType.function || requestType === RequestType.property
}

export function cleanupHandledMessage(context: Context, id: string) {
	const { messagesSent } = context
	// it should be safe to remove the message from the messagesSent store
	// because the application should be maintaining a reference to the state object
	delete messagesSent[id]
}

export type ExposedPromise<T> = {
	resolve: (arg0: T) => void
	reject: (arg0: T) => void
	promise: Promise<T>
}

export function exposedPromiseFactory<T>(): ExposedPromise<T> {
	let resolve: (arg0: T) => void
	let reject: (arg0: T) => void

	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})

	return {
		resolve: resolve!,
		reject: reject!,
		promise,
	}
}

export function uid() {
	return Math.random().toString(36).substring(2)
}