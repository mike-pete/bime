import { RequestType } from '../enums'
import { sendMessage } from '../sendMessage'
import { Context } from '../types'

export default function sendSynAck(context: Context) {
	console.log('sending syn ack')

	const message = {
		id: 0,
		requestType: RequestType.synAck,
	}

	sendMessage(context, message)
	context.lastAckSent = 0
}
