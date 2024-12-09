import Protocol from "devtools-protocol";
import { ICDPSession } from "./cdp-session";
import { ITraceHandler } from "./trace-handler";

export class TargetWorker {
	#cdpSession: ICDPSession;
	#traceViewer: ITraceHandler;

	public constructor(cdpSession: ICDPSession, traceViewer: ITraceHandler) {
		this.#cdpSession = cdpSession;
		this.#traceViewer = traceViewer;
	}

	public async start() {
		if (this.#cdpSession.isAttached) {
			return;
		}

		await this.#cdpSession.attach();

		this.#cdpSession.addListener(
			"Tracing.tracingComplete",
			async ({ stream }) => {
				try {
					let data = "";

					while (true) {
						const {
							data: chunk,
							base64Encoded,
							eof,
						} = await this.#cdpSession.sendCommand("IO.read", {
							handle: stream as Protocol.IO.StreamHandle,
						});

						data += base64Encoded ? atob(chunk) : chunk;

						if (eof) {
							break;
						}
					}

					await this.#cdpSession.detach();
					await this.#traceViewer.getStrikes(data);
				} finally {
					if (this.#cdpSession.isAttached) {
						await this.#cdpSession.detach();
					}
				}
			}
		);

		await this.#cdpSession.sendCommand("Tracing.start", {
			transferMode: "ReturnAsStream",
			streamFormat: "json",
			streamCompression: "none",
			traceConfig: {
				recordMode: "recordUntilFull",
				includedCategories: [
					"-*",
					"devtools.timeline",
					"disabled-by-default-devtools.screenshot",
					"disabled-by-default-cpu_profiler",
					"disabled-by-default-v8.cpu_profiler",
				],
				excludedCategories: ["*"],
			},
		});
	}

	public async stop() {
		if (!this.#cdpSession.isAttached) {
			return;
		}

		await this.#cdpSession.sendCommand("Tracing.end");
	}
}
