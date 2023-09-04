import { RequestType } from '../enums'
import { Context, MessageIdentifier } from '../types'
import { bimeLogWarning, cleanupHandledMessage } from '../utils'

export default function handleAck(
	context: Context,
	message: MessageIdentifier
) {
	const { id } = message
	const { messagesSent, lastAckReceived } = context

	const isSyn = id === 0
	if (!isSyn) {
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

	if (id === lastAckReceived + 1) {
		context.lastAckReceived += 1
	} else {
		// TODO: resend all messages after the lastAckReceived (or 0 whatever is greater)
	}
}

function messageExists(context: Context, id: number) {
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
