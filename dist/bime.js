var RequestType;
(function (RequestType) {
    RequestType["function"] = "function";
    RequestType["property"] = "property";
    RequestType["response"] = "response";
    RequestType["syn"] = "syn";
    RequestType["ack"] = "ack";
})(RequestType || (RequestType = {}));
const HandshakeSynId = 'sync';

function bimeThrowError(message) {
    throw new Error(`bime: ${message}`);
}
bimeThrowError.prototype = Error.prototype;
function bimeLogWarning(message) {
    console.warn(`bime: ${message}`);
}
function bimeLogImpossibility(message) {
    console.error(`BIME LEVEL ERROR: ${message}`);
}
function messageIsRequest({ requestType }) {
    return requestType === RequestType.function || requestType === RequestType.property;
}
function cleanupHandledMessage(context, id) {
    const { messagesSent } = context;
    // it should be safe to remove the message from the messagesSent store
    // because the application should be maintaining a reference to the state object
    delete messagesSent[id];
}
function exposedPromiseFactory() {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return {
        resolve: resolve,
        reject: reject,
        promise,
    };
}
function uid() {
    return Math.random().toString(36).substring(2);
}

function handleAck(context, message) {
    const { id } = message;
    const { messagesSent } = context;
    const isSyn = id === HandshakeSynId;
    if (isSyn) {
        context.isConnected.resolve();
    }
    else {
        if (!messageExists(context, id)) {
            return;
        }
        messagesSent[id].acknowledged = true;
        const acknowledgedMessageWasResponse = messagesSent[id].message.requestType === RequestType.response;
        if (acknowledgedMessageWasResponse) {
            cleanupHandledMessage(context, id);
        }
    }
}
function messageExists(context, id) {
    const { messagesSent, devMode } = context;
    if (!(id in messagesSent)) {
        devMode &&
            bimeLogWarning(`Received an acknowledgement for a message that doesn't exist. This could be intended for another instance of bime.`);
        return false;
    }
    return true;
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

function saveMessageSent(context, message) {
    const { id } = message;
    const { messagesSent } = context;
    messagesSent[id] = {
        acknowledged: false,
        message,
    };
    if (messageIsRequest(message)) {
        return saveRequestState(context, id);
    }
}
function saveRequestState(context, id) {
    const { messagesSent } = context;
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
    if (messageIsRequest(message)) {
        context.isConnected.promise.then(() => {
            sendPostMessage(context, message);
        });
    }
    else {
        sendPostMessage(context, message);
    }
}
function sendPostMessage(context, message) {
    const { target, targetOrigin } = context;
    target.postMessage(JSON.stringify(message), targetOrigin);
}

function sendResponse(context, requestId, data, error) {
    const response = {
        id: uid(),
        requestId,
        requestType: RequestType.response,
        data,
        error,
    };
    saveMessageSent(context, response);
    sendMessage(context, response);
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
        const { property, args, id: requestId } = messageData;
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
        sendResponse(context, requestId, response, error);
    });
}

function handleResponse(context, response) {
    const { messagesSent, devMode } = context;
    const { requestId, data, error } = response;
    if (!(requestId in messagesSent)) {
        // ignore responses for messages that we didn't send
        return;
    }
    const { resolve, reject, state, acknowledged } = messagesSent[requestId];
    if (!(requestId in messagesSent)) {
        devMode &&
            bimeLogWarning(`Response received for unknown message. This response may be for another instance of bime.`);
        return;
    }
    if (acknowledged === false) {
        bimeLogImpossibility(`Response received before message was acknowledged.`);
        // pretend there was an ack
        handleAck(context, { id: requestId, requestType: RequestType.ack });
    }
    if (error) {
        if (reject && typeof reject === 'function') {
            reject(error);
        }
        else {
            bimeLogImpossibility(`attempted to reject promise but reject was [${reject}]`);
        }
    }
    else {
        if (resolve && typeof resolve === 'function') {
            resolve(data);
        }
        else {
            bimeLogImpossibility(`attempted to resolve promise but resolve was [${resolve}]`);
        }
    }
    if (state) {
        state.loading = false;
        state.error = error;
    }
    // TODO: handle edge case where state should exist but doesn't
    cleanupHandledMessage(context, requestId);
}

function sendAck(context, remoteId) {
    const message = {
        id: remoteId,
        requestType: RequestType.ack,
    };
    sendMessage(context, message);
}

function handleMessage(context, event) {
    const messageData = getMessageDataFromEvent(event);
    if (!messageData)
        return;
    const { requestType, id } = messageData;
    if (requestType !== RequestType.ack) {
        sendAck(context, id);
    }
    switch (requestType) {
        case RequestType.ack:
            return handleAck(context, messageData);
        case RequestType.response:
            return handleResponse(context, messageData);
        case RequestType.property:
        case RequestType.function:
            return handleRequest(context, messageData);
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
    if (messageIsRequest(messageData) && !('property' in messageData)) {
        bimeLogWarning(`A request was made, but no property or function was provided.`);
        return;
    }
    return messageData;
}

function sendRequest(context, requestType, property, args = []) {
    const request = {
        id: uid(),
        requestType,
        property,
        args,
    };
    const state = saveMessageSent(context, request);
    sendMessage(context, request);
    return state;
}

function sendSyn(context) {
    const message = {
        id: HandshakeSynId,
        requestType: RequestType.syn,
    };
    sendMessage(context, message);
}

function bime(target, model = {}, targetOrigin, devMode = false) {
    const messagesSent = {};
    const context = {
        target,
        model,
        messagesSent,
        isConnected: exposedPromiseFactory(),
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
        console.log('send syn');
        sendSyn(context);
    }, 300);
    context.isConnected.promise.then(() => {
        clearInterval(interval);
    });
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
