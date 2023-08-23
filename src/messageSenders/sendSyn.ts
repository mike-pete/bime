import { RequestType } from '../enums'
import { sendMessage } from '../sendMessage'
import { Context } from '../types'

export default function sendSyn(context: Context) {
	context.lastMessageSent = 0
	console.log('sending syn')

	const message = {
		id: 0,
		requestType: RequestType.syn,
	}

	sendMessage(context, message)
}
