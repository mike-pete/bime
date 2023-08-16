var RequestType;
(function (RequestType) {
    RequestType["function"] = "function";
    RequestType["property"] = "property";
    RequestType["response"] = "response";
})(RequestType || (RequestType = {}));

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

function createUUID() {
    return self.crypto.randomUUID();
}
function bimeThrowError(message) {
    throw new Error(`bime: ${message}`);
}
bimeThrowError.prototype = Error.prototype;
function bimeLogWarning(message) {
    console.warn(`bime: ${message}`);
}
function bimeLogError(message) {
    console.error(`BIME LEVEL ERROR: ${message}`);
}

function storeMessageState(context, id) {
    const { messagesSent } = context;
    messagesSent[id] = {};
    const data = new Promise((resolve, reject) => {
        messagesSent[id].resolve = resolve;
        messagesSent[id].reject = reject;
    });
    const state = {
        loading: true,
        data,
        error: undefined,
    };
    messagesSent[id].state = state;
    return state;
}
function sendRequest(context, requestType, property, args = []) {
    const id = createUUID();
    const messageData = {
        id,
        requestType,
        property,
        args,
    };
    const data = JSON.stringify(messageData);
    const { target, targetOrigin } = context;
    const state = storeMessageState(context, id);
    target.postMessage(data, targetOrigin);
    return state;
}
function sendResponse(context, id, data, error) {
    const { target, targetOrigin } = context;
    const responseData = {
        id,
        requestType: RequestType.response,
        data,
        error,
    };
    const response = JSON.stringify(responseData);
    target.postMessage(response, targetOrigin);
}

function handleMessage(context, event) {
    const { targetOrigin, devMode } = context;
    const { origin, data } = event;
    if (targetOrigin != '*' && origin !== targetOrigin) {
        if (devMode) {
            bimeLogWarning(`Message received from unknown origin [ ${origin} ].`);
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
    const { reject, resolve, state } = messagesSent[id];
    if (!(id in messagesSent)) {
        devMode &&
            bimeLogWarning(`Response received for unknown message. This response may be for another instance of bime.`);
        return;
    }
    if (error) {
        if (reject && typeof reject === 'function') {
            reject(error);
        }
        else {
            devMode &&
                bimeLogError(`attempted to reject promise but reject was [${reject}]`);
        }
    }
    else {
        if (resolve && typeof resolve === 'function') {
            resolve(data);
        }
        else {
            devMode &&
                bimeLogError(`attempted to resolve promise but resolve was [${resolve}]`);
        }
    }
    if (state) {
        state.loading = false;
        state.error = error;
    }
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
            bimeThrowError(`The ${label} name is required, but was not provided.`);
        }
        if (!(property in model)) {
            bimeThrowError(`[ ${property} ] does not exist in the target's model.`);
        }
        // TODO: simplify this
        switch (requestType) {
            case RequestType.property:
                if (typeof model[property] === 'function') {
                    bimeThrowError(`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`);
                }
                break;
            case RequestType.function:
                if (typeof model[property] !== 'function') {
                    bimeThrowError(`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`);
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
function invokeMethod(context, property, args) {
    return sendRequest(context, RequestType.function, property, args);
}

export { bime as default };
