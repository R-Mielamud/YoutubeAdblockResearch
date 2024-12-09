export interface ITraceHandler {
	getStrikes(trace: string): void | Promise<void>;
}
