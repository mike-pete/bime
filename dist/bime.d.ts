type Model = Record<string, (...args: any[]) => any>;
declare const bime: <T extends Model>(target: Window) => T;
export default bime;
