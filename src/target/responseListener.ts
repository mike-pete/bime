import { Model } from "../bime";
import { SentMessageStore } from "./types";

const responseListener = <RemoteModel extends Model>(
  sentMessagesStore: SentMessageStore<RemoteModel>,
  origin: string,
) => {
  const handler = messageHandler<RemoteModel>(sentMessagesStore, origin);
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
};

const messageHandler =
  <RemoteModel extends Model>(
    sentMessagesStore: SentMessageStore<RemoteModel>,
    origin: string,
  ) =>
  (event: MessageEvent) => {
    if (origin !== "*" && origin !== event.origin) return;

    const id = event.data?.id;
    if (!id) return;

    const type = event.data?.type;
    if (type !== "response" && type !== "error" && type !== "ack") return;

    const sentMessage = sentMessagesStore[id];
    if (!sentMessage) return;

    if (event.source !== sentMessage.target) return;

    switch (type) {
      case "response":
        return handleResponse<RemoteModel>(event, sentMessagesStore);
      case "error":
        return handleError<RemoteModel>(event, sentMessagesStore);
      case "ack":
        return handleAck<RemoteModel>(event, sentMessagesStore);
      default:
        return;
    }
  };

const handleResponse = <RemoteModel extends Model>(
  event: MessageEvent,
  sentMessagesStore: SentMessageStore<RemoteModel>,
) => {
  const { id, data } = event.data;
  const sentMessage = sentMessagesStore[id];
  sentMessage.promise.resolve(data);
};

const handleError = <RemoteModel extends Model>(
  event: MessageEvent,
  sentMessagesStore: SentMessageStore<RemoteModel>,
) => {
  const { id, error } = event.data;
  const sentMessage = sentMessagesStore[id];
  sentMessage.promise.reject(error);
};

const handleAck = <RemoteModel extends Model>(
  event: MessageEvent,
  sentMessagesStore: SentMessageStore<RemoteModel>,
) => {
  const { id } = event.data;
  const sentMessage = sentMessagesStore[id];
  sentMessage.acknowledged = true;
};

export default responseListener;
