var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var RequestType;
(function (RequestType) {
    RequestType["function"] = "function";
    RequestType["property"] = "property";
    RequestType["response"] = "response";
})(RequestType || (RequestType = {}));
// TODO: change model any
function bime(target, model = {}, targetOrigin, devMode = false) {
    const messagesSent = {};
    const context = {
        target,
        model,
        messagesSent,
        targetOrigin,
        devMode,
    };
    window.addEventListener('message', handleMessage.bind(null, context), false);
    return {
        get: getProperty.bind(null, context),
        invoke: invokeMethod.bind(null, context),
    };
}
function getProperty(context, property) {
    return sendRequest(context, RequestType.property, property);
}
// TODO: change any
function invokeMethod(context, property, args) {
    return sendRequest(context, RequestType.function, property, args);
}
// TODO: change any
function storeMessageState(context, id) {
    const { messagesSent } = context;
    let resolve;
    let reject;
    const data = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    const state = {
        loading: true,
        data,
        error: undefined,
    };
    messagesSent[id] = {
        state,
        resolve,
        reject,
    };
    return state;
}
function sendRequest(context, requestType, property, args = []) {
    const id = createUUID();
    const data = JSON.stringify({ id, requestType, property, args });
    const { target, targetOrigin } = context;
    const state = storeMessageState(context, id);
    target.postMessage(data, targetOrigin);
    return state;
}
function sendResponse(context, id, data, error) {
    const { target, targetOrigin } = context;
    const response = JSON.stringify({
        id,
        requestType: RequestType.response,
        data,
        error,
    });
    target.postMessage(response, targetOrigin);
}
function handleMessage(context, event) {
    const { targetOrigin, devMode } = context;
    const { origin, data } = event;
    if (targetOrigin != '*' && origin !== targetOrigin) {
        if (devMode) {
            warn(`Message received from unknown origin [ ${origin} ].`);
        }
        return;
    }
    let messageData;
    try {
        messageData = JSON.parse(data);
    }
    catch (_a) {
        // ignore messages that aren't JSON, they're not relevant to bime
        return;
    }
    if (!(messageData === null || messageData === void 0 ? void 0 : messageData.requestType)) {
        // ignore messages that don't have a requestType, they're not relevant to bime
        return;
    }
    if (messageData.requestType === RequestType.response) {
        handleResponse(context, messageData);
    }
    else {
        handleRequest(context, messageData);
    }
}
function handleResponse(context, messageData) {
    const { messagesSent, devMode } = context;
    const { id, data, error } = messageData;
    if (!(id in messagesSent)) {
        if (devMode) {
            warn(`Response received for unknown message. This response may be for another instance of bime.`);
        }
        return;
    }
    if (error) {
        messagesSent[id].state.error = error;
        messagesSent[id].reject(error);
    }
    else {
        messagesSent[id].resolve(data);
    }
    messagesSent[id].state.loading = false;
    messagesSent[id].state.error = error;
    // it should be safe to remove the message from the messagesSent store
    // because the application should be maintaining a reference to the state object
    delete messagesSent[id];
}
function handleRequest(context, messageData) {
    return __awaiter(this, void 0, void 0, function* () {
        const { model } = context;
        const { requestType, property, args, id } = messageData;
        if (!property) {
            const label = requestType === RequestType.function ? 'function' : 'property';
            throwError(`The ${label} name is required, but was not provided.`);
        }
        if (!(property in model)) {
            throwError(`[ ${property} ] does not exist in the target's model.`);
        }
        // TODO: simplify this
        switch (requestType) {
            case RequestType.property:
                if (typeof model[property] === 'function') {
                    throwError(`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`);
                }
                break;
            case RequestType.function:
                if (typeof model[property] !== 'function') {
                    throwError(`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`);
                }
                break;
        }
        let response;
        if (typeof model[property] !== 'function') {
            response = model[property];
        }
        else {
            response = yield model[property](...args);
        }
        // TODO
        let error;
        sendResponse(context, id, response, error);
    });
}
function createUUID() {
    return self.crypto.randomUUID();
}
function throwError(message) {
    throw new Error(`bime: ${message}`);
}
throwError.prototype = Error.prototype;
function warn(message) {
    console.warn(`bime: ${message}`);
}
export default bime;
