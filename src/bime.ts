type Model = Record<string, (...args: any[]) => any>

const bime = <T extends Model>(target: Window) => {
	
	const sendMessage = (message: string) => {
		target.postMessage(message, '*')
	}

	const handler: ProxyHandler<T> = {
		get: (target: T, prop: string) => {
			return (...args: Parameters<T[keyof T]>): ReturnType<T[keyof T]> => {
				console.log('invoking', prop)
				sendMessage(`prop:${prop}, target:${JSON.stringify(target)}, args:${JSON.stringify(args)}`)
				return null
			}
		},
	}

	return new Proxy<T>({} as T, handler)
}

// type RemoteModelType = {
// 	greet: (name: string) => string
// }

// const window = new Window()

// let bi = bime<RemoteModelType>(window)

// bi.greet('Mike')

export default bime
