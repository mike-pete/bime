import { HandshakeSynId, RequestType } from '../enums'
import { Context, MessageIdentifier } from '../types'
import { bimeLogWarning, cleanupHandledMessage } from '../utils'

export default function handleAck(context: Context, message: MessageIdentifier) {
	const { id } = message
	const { messagesSent } = context
	const isSyn = id === HandshakeSynId

	if (isSyn) {
		context.isConnected.resolve()
	} else {
		if (!messageExists(context, id)) {
			return
		}
		messagesSent[id].acknowledged = true
		const acknowledgedMessageWasResponse =
			messagesSent[id].message.requestType === RequestType.response
		if (acknowledgedMessageWasResponse) {
			cleanupHandledMessage(context, id)
		}
	}
}

function messageExists(context: Context, id: string) {
	const { messagesSent, devMode } = context
	if (!(id in messagesSent)) {
		devMode &&
			bimeLogWarning(
				`Received an acknowledgement for a message that doesn't exist. This could be intended for another instance of bime.`
			)
		return false
	}
	return true
}
