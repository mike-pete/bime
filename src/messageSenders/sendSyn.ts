import { HandshakeSynId, RequestType } from '../enums'
import { sendMessage } from '../sendMessage'
import { Context } from '../types'

export default function sendSyn(context: Context) {
	const message = {
		id: HandshakeSynId,
		requestType: RequestType.syn,
	}

	sendMessage(context, message)
}
