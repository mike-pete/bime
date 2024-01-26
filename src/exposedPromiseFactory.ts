export type ResolveType<T> = (value: T | PromiseLike<T>) => void
export type RejectType = (reason?: any) => void

const exposedPromiseFactory = <T>() => {
	let resolve: ResolveType<T>
	let reject: RejectType

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

export default exposedPromiseFactory
