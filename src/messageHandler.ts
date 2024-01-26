export const listenForMessages = () => {
	window.addEventListener('message', messageHandler)
}

const messageHandler = (event: MessageEvent) => {
	console.log('incoming message:', event.data)
	// Do we trust the sender of this message?  (might be
	// different from what we originally opened, for example).
	// if (event.origin !== 'http://example.com') return
}


