import { Model } from "../bime";

type ResponseMessage<T extends Model> = {
  id: string;
  type: "response";
  data: ReturnType<T[keyof T]> | "acknowledged";
};

type ErrorMessage = {
  id: string;
  type: "error";
  error: Error;
};

type AckMessage = {
  id: string;
  type: "ack";
};

const listen = (origin: string | string[], model: Model) => {
  let cleanedUp = false;

  if ("cleanup" in model) {
    console.warn(
      '"cleanup" is a reserved property name and cannot be used on the model.',
    );
  }

  const handler = invokeHandler(origin, model);
  window.addEventListener("message", handler);

  return {
    cleanup: () => {
      if (cleanedUp) {
        throw new Error("The listener has been cleaned up.");
      }
      cleanedUp = true;
      window.removeEventListener("message", handler);
    },
  };
};

const invokeHandler =
  (origin: string | string[], model: Model) => (event: MessageEvent) => {
    if (origin !== "*") {
      if (Array.isArray(origin) && !origin.includes(event.origin)) return;
      else if (origin !== event.origin) return;
    }

    const id = event.data?.id;
    if (!id) return;

    const type = event.data?.type;
    if (type !== "request") return;

    const { prop, args } = event.data;
    if (!prop) return;

    sendResponse(
      { id: event.data.id, type: "ack" },
      event.source as Window,
      event.origin,
    );

    if (!(prop in model)) {
      const error = new ReferenceError(
        `Property "${prop}" does not exist on model`,
      );
      sendResponse(
        { id: event.data.id, type: "error", error },
        event.source as Window,
        event.origin,
      );
      return;
    }

    try {
      const invocationResult = model[prop](...args);
      sendResponse(
        { id: event.data.id, type: "response", data: invocationResult },
        event.source as Window,
        event.origin,
      );
    } catch (error) {
      sendResponse(
        { id: event.data.id, type: "error", error },
        event.source as Window,
        event.origin,
      );
    }
  };

const sendResponse = <LocalModel extends Model>(
  message: AckMessage | ResponseMessage<LocalModel> | ErrorMessage,
  target: Window,
  origin: string,
) => {
  target.postMessage(message, origin);
};

export default listen;
