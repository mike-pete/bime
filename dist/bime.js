const bime = (target) => {
    const sentMessages = {};
    const sendMessage = (prop, args) => {
        target.postMessage({ prop, args }, '*');
        const { promise, resolve, reject } = exposedPromiseFactory();
        const id = Math.random().toString(36).substring(7);
        sentMessages[id] = { resolve, reject, acknowledged: false };
        return promise;
    };
    const handler = {
        get: (target, prop) => {
            return (...args) => {
                return sendMessage(prop, args);
            };
        },
    };
    return new Proxy({}, handler);
};
const exposedPromiseFactory = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        resolve,
        reject,
        promise,
    };
};
// type RemoteModelType = {
// 	greet: (name: string) => string
// }
// const window = new Window()
// let bi = bime<RemoteModelType>(window)
// const response = bi.greet('Mike')
export default bime;
