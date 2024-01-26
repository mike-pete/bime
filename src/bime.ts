import exposedPromiseFactory, { RejectType, ResolveType } from "./exposedPromiseFactory";

type Model = Record<string, (...args: any[]) => any>

type MessageResponse<T> = {
	[K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never
}

const bime = <T extends Model>(target: Window) => {
	const sentMessages: Record<
		string,
		{ resolve: ResolveType<ReturnType<T[keyof T]>>; reject: RejectType; acknowledged: boolean }
	> = {}

	const sendMessage = (prop: string, args: Parameters<T[keyof T]>) => {
		target.postMessage({ prop, args }, '*')
		const { promise, resolve, reject } = exposedPromiseFactory<ReturnType<T[keyof T]>>()
		const id = Math.random().toString(36).substring(7)
		sentMessages[id] = { resolve, reject, acknowledged: false }
		return promise
	}

	const handler: ProxyHandler<MessageResponse<T>> = {
		get: (target: MessageResponse<T>, prop: string) => {
			return (...args: Parameters<T[keyof T]>) => {
				return sendMessage(prop, args)
			}
		},
	}

	return new Proxy<MessageResponse<T>>({} as any, handler)
}


// type RemoteModelType = {
// 	greet: (name: string) => string
// }

// const window = new Window()

// let bi = bime<RemoteModelType>(window)

// const response = bi.greet('Mike')

export default bime
