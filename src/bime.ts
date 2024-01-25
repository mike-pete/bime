type Model = Record<string, (...args: any[]) => any>

type MessageResponse<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never
}

const bime = <T extends Model>(target: Window) => {
	const sendMessage = <T extends Model>(prop: string, args: Parameters<T[keyof T]>) => {
		target.postMessage({ prop, args }, '*')
		const { promise, resolve } = exposedPromiseFactory<ReturnType<T[keyof T]>>()
		return promise
	}

	const handler: ProxyHandler<MessageResponse<T>> = {
		get: (target: MessageResponse<T>, prop: string) => {
			return (...args: Parameters<T[keyof T]>) => {
				return sendMessage<T>(prop, args)
			}
		},
	}

	return new Proxy<MessageResponse<T>>({} as any, handler)
}

const exposedPromiseFactory = <T>() => {
	let resolve: (value: T | PromiseLike<T>) => void
	let reject: (reason: any) => void

	const promise = new Promise<T>((res, rej) => {
		resolve = res
		reject = rej
	})

	return {
		resolve,
		reject,
		promise,
	}
}

// type RemoteModelType = {
// 	greet: (name: string) => string
// }

// const window = new Window()

// let bi = bime<RemoteModelType>(window)

// const response = bi.greet('Mike')

export default bime
