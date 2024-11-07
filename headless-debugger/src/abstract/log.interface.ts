export interface ILog {
	log(message: string): void;

	close(): Promise<void>;
}
