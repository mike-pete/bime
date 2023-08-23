import sendSynAck from '../messageSenders/sendSynAck'
import { Context } from '../types'

export default function handleSyn(context: Context) {
	console.log('handleSyn')
	sendSynAck(context)
}
