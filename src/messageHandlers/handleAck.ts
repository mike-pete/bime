import { Context, MessageIdentifier } from '../types'
import { bimeLogWarning } from '../utils'

export default function handleAck(
	context: Context,
	messageData: MessageIdentifier
) {
	const { id } = messageData
	const { messagesSent } = context

	const isSyn = id === 0
	if (!isSyn) {
		if (!messageExists(context, id)) {
			return
		}
		messagesSent[id].acknowledged = true
	}

	context.lastAckReceived = id
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
