var RequestType;
(function (RequestType) {
    RequestType["function"] = "function";
    RequestType["property"] = "property";
    RequestType["response"] = "response";
    RequestType["syn"] = "syn";
    RequestType["synAck"] = "synAck";
    RequestType["ack"] = "ack";
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

function storeMessageState(context, id, request) {
    const { messagesSent } = context;
    messagesSent[id] = {
        acknowledged: false,
        request,
    };
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
function sendMessage(context, message) {
    const { target, targetOrigin } = context;
    target.postMessage(JSON.stringify(message), targetOrigin);
}
function sendRequest(context, requestType, property, args = []) {
    var _a;
    const id = (_a = context.lastMessageSent) !== null && _a !== void 0 ? _a : 0 + 1;
    const requestData = {
        id,
        requestType,
        property,
        args,
    };
    const state = storeMessageState(context, id, requestData);
    sendMessage(context, requestData);
    return state;
}
function sendResponse(context, id, data, error) {
    const response = {
        id,
        requestType: RequestType.response,
        data,
        error,
    };
    sendMessage(context, response);
}
function sendSyn(context) {
    context.lastMessageSent = 0;
    console.log('sending syn');
    const message = {
        id: 0,
        requestType: RequestType.syn,
    };
    sendMessage(context, message);
}
function sendSynAck(context) {
    console.log('sending syn ack');
    const message = {
        id: 0,
        requestType: RequestType.synAck,
    };
    sendMessage(context, message);
    context.lastAckSent = 0;
}
function sendAck(context, remoteId) {
    console.log('sending ack');
    const message = {
        id: remoteId,
        requestType: RequestType.ack,
    };
    sendMessage(context, message);
    context.lastAckSent = remoteId;
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
    switch (messageData.requestType) {
        case RequestType.response:
            return handleResponse(context, messageData);
        case RequestType.property:
        case RequestType.function:
            return handleRequest(context, messageData);
        case RequestType.syn:
            return handleSyn(context);
        case RequestType.synAck:
            return handleSynAck(context);
        case RequestType.ack:
            return handleAck(context, messageData);
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
            const functionToInvoke = model[property];
            response = yield functionToInvoke(...(args !== null && args !== void 0 ? args : []));
        }
        // TODO
        let error;
        sendResponse(context, id, response, error);
    });
}
function handleSyn(context) {
    console.log('handleSyn');
    sendSynAck(context);
}
function handleSynAck(context) {
    console.log('handle syn ack');
    context.lastAckReceived = 0;
    sendAck(context, 0); // TODO: replace 0 with real id
}
function handleAck(context, messageData) {
    const { id } = messageData;
    console.log('handle ack', id);
    context.lastAckReceived = id;
}

function bime(target, model = {}, targetOrigin, devMode = false) {
    const messagesSent = {};
    const context = {
        target,
        model,
        lastMessageSent: undefined,
        lastAckReceived: undefined,
        lastAckSent: undefined,
        messagesSent,
        targetOrigin,
        devMode,
    };
    const interval = setInterval(() => {
        if (context.lastAckReceived !== undefined || context.lastAckSent !== undefined) {
            clearInterval(interval);
        }
        else {
            sendSyn(context);
        }
    }, 100);
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
