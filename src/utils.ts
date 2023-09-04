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

export function getNextMessageId(context: Context) {
	return (context.lastMessageSent ?? 0) + 1
}

export function messageIsRequest({ requestType }: MessageIdentifier) {
	return (
		requestType === RequestType.function || requestType === RequestType.property
	)
}

export function cleanupHandledMessage(context: Context, id: number) {
	const { messagesSent } = context
	// it should be safe to remove the message from the messagesSent store
	// because the application should be maintaining a reference to the state object
	delete messagesSent[id]
}
