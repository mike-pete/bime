import { RequestType } from '../enums'
import { sendMessage } from '../sendMessage'
import { Context } from '../types'

export default function sendAck(context: Context, remoteId: string) {
	const message = {
		id: remoteId,
		requestType: RequestType.ack,
	}

	sendMessage(context, message)
}
