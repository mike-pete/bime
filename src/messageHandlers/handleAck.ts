import { Context, MessageIdentifier } from "../types"

export default function handleAck(context: Context, messageData: MessageIdentifier) {
	const { id } = messageData
	console.log('handle ack', id)
	context.lastAckReceived = id
}