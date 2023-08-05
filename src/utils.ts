export function createUUID() {
	return self.crypto.randomUUID()
}

export function bimeThrowError(message: string) {
	throw new Error(`bime: ${message}`)
}
bimeThrowError.prototype = Error.prototype

export function bimeLogWarning(message: string) {
	console.warn(`bime: ${message}`)
}

export function bimeLogError(message: string) {
	console.error(`BIME LEVEL ERROR: ${message}`)
}