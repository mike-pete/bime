import { RequestType } from '../enums'
import { sendMessage } from '../sendMessage'
import { Context } from '../types'

export default function sendSyn(context: Context) {
	const message = {
		id: 0,
		requestType: RequestType.syn,
	}

	sendMessage(context, message)
}
