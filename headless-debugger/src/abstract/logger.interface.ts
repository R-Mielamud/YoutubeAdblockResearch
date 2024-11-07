export interface ILogger {
	logInfoMessage(message: string): void;

	logIntermediateResult(data: any): void;

	close(): Promise<void>;
}
