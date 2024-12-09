import { ILogger } from "./abstract";

export class ConsoleLogger implements ILogger {
	public logInfoMessage(message: string): void {
		console.log(message);
	}

	public logIntermediateResult(data: any): void {
		console.log(data);
	}
}
