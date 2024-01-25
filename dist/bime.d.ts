type Model = Record<string, (...args: any[]) => any>;
type MessageResponse<T> = {
    [K in keyof T]: T[K] extends (...args: infer A) => infer R ? (...args: A) => Promise<R> : never;
};
declare const bime: <T extends Model>(target: Window) => MessageResponse<T>;
export default bime;
