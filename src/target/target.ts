import type { Model } from "../bime";
import type { AutoRetryOptions, SentMessageStore } from "./types";
import requestSender from "./requestSender";
import responseListener from "./responseListener";

type MessageResponse<RemoteModel> = {
  [K in keyof RemoteModel]: RemoteModel[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : never;
};

type Target<RemoteModel extends Model> = {
  cleanup: () => void;
} & MessageResponse<RemoteModel>;

const target = <RemoteModel extends Model>(
  target: Window,
  origin: string,
  options?: AutoRetryOptions,
) => {
  const sentMessagesStore: SentMessageStore<RemoteModel> = {};
  const sendRequest = requestSender<RemoteModel>(
    sentMessagesStore,
    target,
    origin,
    options,
  );
  const cleanup = responseListener<RemoteModel>(sentMessagesStore, origin);

  let cleanedUp = false;

  const handler: ProxyHandler<MessageResponse<RemoteModel>> = {
    get: (_, prop: string) => {
      if (prop === "cleanup") {
        return () => {
          if (cleanedUp) {
            throw new Error("The response listener has been cleaned up.");
          }
          cleanup();
          cleanedUp = true;
        };
      }
      return (...args: Parameters<RemoteModel[keyof RemoteModel]>) => {
        if (cleanedUp) {
          throw new Error("The response listener has been cleaned up.");
        }
        return sendRequest({
          type: "request",
          prop,
          args,
        });
      };
    },
  };
  return new Proxy<Target<RemoteModel>>({} as Target<RemoteModel>, handler);
};

export default target;
