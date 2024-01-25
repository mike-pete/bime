const bime = (target) => {
    const sendMessage = (message) => {
        target.postMessage(message, '*');
    };
    const handler = {
        get: (target, prop) => {
            return (...args) => {
                console.log('invoking', prop);
                sendMessage(`prop:${prop}, target:${JSON.stringify(target)}, args:${JSON.stringify(args)}`);
                return null;
            };
        },
    };
    return new Proxy({}, handler);
};
// type RemoteModelType = {
// 	greet: (name: string) => string
// }
// const window = new Window()
// let bi = bime<RemoteModelType>(window)
// bi.greet('Mike')
export default bime;
