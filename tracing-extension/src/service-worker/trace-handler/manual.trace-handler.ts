import { MAX_MESSAGE_LENGTH_B } from "../constants";

export class ManualTraceHandler {
	#port?: chrome.runtime.Port;
	#connectionCallback?: () => void;

	public constructor() {
		chrome.runtime.onConnect.addListener((port) => {
			if (port.name !== "trace-viewer") {
				return;
			}

			port.onDisconnect.addListener(() => {
				this.#port = undefined;
			});

			port.onMessage.addListener(this.#handleMessage);

			this.#port = port;
			this.#connectionCallback?.();
		});
	}

	public async getStrikes(trace: string) {
		await this.#ensureConnection();

		this.#port?.postMessage({
			type: "trace-start",
		});

		for (
			let index = 0;
			index < trace.length;
			index += MAX_MESSAGE_LENGTH_B
		) {
			this.#port?.postMessage({
				type: "trace-chunk",
				chunk: trace.substring(index, index + MAX_MESSAGE_LENGTH_B),
			});
		}

		this.#port?.postMessage({
			type: "trace-end",
		});
	}

	#ensureConnection(): Promise<void> {
		return new Promise((resolve) => {
			if (this.#port) {
				return resolve();
			}

			this.#connectionCallback = () => {
				this.#connectionCallback = undefined;
				resolve();
			};

			chrome.tabs.create({
				url: chrome.runtime.getURL("trace-viewer/index.html"),
				active: true,
			});
		});
	}

	#handleMessage = (message: any): void => {
		if (!message) {
			return;
		}

		switch (message.type) {
			default: {
				console.log("message", message);
				break;
			}
		}
	};
}
