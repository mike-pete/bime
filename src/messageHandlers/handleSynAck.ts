import sendAck from '../messageSenders/sendAck'
import { Context } from '../types'

export default function handleSynAck(context: Context) {
	console.log('handle syn ack')
	context.lastAckReceived = 0
	sendAck(context, 0) // TODO: replace 0 with real id
}
