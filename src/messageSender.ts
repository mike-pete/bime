import { MessagesSent, Model } from './bime'
import createExposedPromise from './createExposedPromise'

const messageSender =
	<RemoteModel extends Model>(sentMessages: MessagesSent<RemoteModel>, target: Window) =>
	(prop: string, args: Parameters<RemoteModel[keyof RemoteModel]>) => {
		const { promise, resolve, reject } =
			createExposedPromise<ReturnType<RemoteModel[keyof RemoteModel]>>()
		const id = Math.random().toString(36).substring(7)
		sentMessages[id] = { resolve, reject, acknowledged: false }
		target.postMessage({ prop, args }, '*')
		return promise
	}

export default messageSender
