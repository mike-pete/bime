import { Context, ResponseMessage } from "../types"
import { bimeLogError, bimeLogWarning } from "../utils"

export default function handleResponse(context: Context, messageData: ResponseMessage) {
	const { messagesSent, devMode } = context
	const { id, data, error } = messageData
	const { reject, resolve, state } = messagesSent[id]

	if (!(id in messagesSent)) {
		devMode &&
			bimeLogWarning(
				`Response received for unknown message. This response may be for another instance of bime.`
			)
		return
	}

	if (error) {
		if (reject && typeof reject === 'function') {
			reject(error)
		} else {
			devMode &&
				bimeLogError(`attempted to reject promise but reject was [${reject}]`)
		}
	} else {
		if (resolve && typeof resolve === 'function') {
			resolve(data)
		} else {
			devMode &&
				bimeLogError(
					`attempted to resolve promise but resolve was [${resolve}]`
				)
		}
	}

	if (state) {
		state.loading = false
		state.error = error
	}

	// it should be safe to remove the message from the messagesSent store
	// because the application should be maintaining a reference to the state object
	delete messagesSent[id]
}
