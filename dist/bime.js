var RequestType;
(function (RequestType) {
    RequestType["function"] = "function";
    RequestType["property"] = "property";
    RequestType["response"] = "response";
    RequestType["syn"] = "syn";
    RequestType["synAck"] = "synAck";
    RequestType["ack"] = "ack";
})(RequestType || (RequestType = {}));

function handleAck(context, messageData) {
    const { id } = messageData;
    console.log('handle ack', id);
    context.lastAckReceived = id;
}

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

function sendMessage(context, message) {
    const { target, targetOrigin } = context;
    target.postMessage(JSON.stringify(message), targetOrigin);
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

function validPropertyRequest(context, messageData) {
    const { model } = context;
    const { requestType, property } = messageData;
    const propertyError = (error) => ({ valid: false, error });
    if (!property) {
        const label = requestType === RequestType.function ? 'function' : 'property';
        return propertyError(`The ${label} name is required, but was not provided.`);
    }
    if (!(property in model)) {
        return propertyError(`[ ${property} ] does not exist in the target's model.`);
    }
    switch (requestType) {
        case RequestType.property:
            if (typeof model[property] === 'function') {
                return propertyError(`[ ${property} ] is a function, not a property. Use \`invoke('${property}', [])\` instead.`);
            }
            break;
        case RequestType.function:
            if (typeof model[property] !== 'function') {
                return propertyError(`[ ${property} ] is a property, not a function. Use \`get('${property}')\` instead.`);
            }
            break;
    }
    return { valid: true, error: '' };
}
function handleRequest(context, messageData) {
    return __awaiter(this, void 0, void 0, function* () {
        const { model } = context;
        const { property, args, id } = messageData;
        const { valid, error: propertyError } = validPropertyRequest(context, messageData);
        if (!valid) {
            bimeThrowError(propertyError !== null && propertyError !== void 0 ? propertyError : 'something went wrong');
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
            bimeLogError(`attempted to reject promise but reject was [${reject}]`);
        }
    }
    else {
        if (resolve && typeof resolve === 'function') {
            resolve(data);
        }
        else {
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

function sendSynAck(context) {
    console.log('sending syn ack');
    const message = {
        id: 0,
        requestType: RequestType.synAck,
    };
    sendMessage(context, message);
    context.lastAckSent = 0;
}

function handleSyn(context) {
    console.log('handleSyn');
    sendSynAck(context);
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

function handleSynAck(context) {
    console.log('handle syn ack');
    context.lastAckReceived = 0;
    sendAck(context, 0); // TODO: replace 0 with real id
}

function handleMessage(context, event) {
    const messageData = getMessageDataFromEvent(event);
    if (!messageData)
        return;
    const { requestType } = messageData;
    switch (requestType) {
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
function getMessageDataFromEvent(event) {
    const { data } = event;
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
    if (!('id' in messageData)) {
        // ignore messages that don't have an id, they're not relevant to bime
        return;
    }
    const { requestType } = messageData;
    const messageIsRequest = requestType === RequestType.property || requestType === RequestType.function;
    if (messageIsRequest && !('property' in messageData)) {
        bimeLogWarning(`A request was made, but no property or function was provided.`);
        return;
    }
    return messageData;
}

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

function sendSyn(context) {
    context.lastMessageSent = 0;
    console.log('sending syn');
    const message = {
        id: 0,
        requestType: RequestType.syn,
    };
    sendMessage(context, message);
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
    sendSynMessages(context);
    window.addEventListener('message', messageListener.bind(null, context), false);
    return {
        get: getProperty.bind(null, context),
        invoke: invokeMethod.bind(null, context),
    };
}
function sendSynMessages(context) {
    const interval = setInterval(() => {
        const receivedAck = context.lastAckReceived !== undefined;
        const sentAck = context.lastAckSent !== undefined;
        if (receivedAck || sentAck) {
            return clearInterval(interval);
        }
        sendSyn(context);
    }, 100);
}
function messageListener(context, event) {
    if (originIsValid(context, event)) {
        handleMessage(context, event);
    }
}
function getProperty(context, property) {
    return sendRequest(context, RequestType.property, property);
}
function invokeMethod(context, property, args) {
    return sendRequest(context, RequestType.function, property, args);
}
function originIsValid({ targetOrigin, devMode }, { origin }) {
    const originIsValid = targetOrigin === '*' || origin === targetOrigin;
    if (!originIsValid && devMode) {
        bimeLogWarning(`Message received from unknown origin [ ${origin} ].`);
    }
    return originIsValid;
}

export { bime as default };
