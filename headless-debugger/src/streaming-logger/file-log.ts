import fs from "node:fs";
import { ILog } from "@/abstract";

export class FileLog implements ILog {
	#stream: fs.WriteStream;
	#buffer = "";
	#ready = false;

	public constructor(filePath: string) {
		this.#stream = fs.createWriteStream(filePath, {
			flush: true,
			flags: "a",
		});

		this.#stream.once("ready", () => {
			this.#ready = true;
			this.#stream.write(this.#buffer);
			this.#buffer = "";
		});
	}

	public log(message: string): void {
		const formatted: string = this.#formatMessage(message);

		if (this.#ready) {
			this.#stream.write(formatted);
		} else {
			this.#buffer += formatted;
		}
	}

	public close(): Promise<void> {
		return new Promise((resolve) => this.#stream.close(() => resolve()));
	}

	#formatMessage(message: string): string {
		return `[${new Date().toISOString()}] ${message}\n`;
	}
}
