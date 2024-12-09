import ProtocolMapping from "devtools-protocol/types/protocol-mapping";
import { ParameterlessCommands } from "src/typings";
import { ICDPSession } from "./abstract";

export class ChromeExtensionCDPSession implements ICDPSession {
	#tabId: number;
	#attached = false;
	#isChangingAttachment = false;
	#listenerRemovers: Array<() => void> = [];

	public constructor(tabId: number) {
		this.#tabId = tabId;
	}

	public get isAttached(): boolean {
		return this.#attached;
	}

	get #target(): chrome.debugger.Debuggee {
		return { tabId: this.#tabId };
	}

	public async attach(): Promise<void> {
		if (this.#attached || this.#isChangingAttachment) {
			return;
		}

		this.#isChangingAttachment = true;

		try {
			await chrome.debugger.attach(this.#target, "1.3");

			this.#attached = true;
		} finally {
			this.#isChangingAttachment = false;
		}
	}

	public async detach(): Promise<void> {
		if (!this.#attached || this.#isChangingAttachment) {
			return;
		}

		this.#isChangingAttachment = true;

		try {
			this.#attached = false;
			this.removeAllListeners();

			await chrome.debugger.detach(this.#target);
		} finally {
			this.#isChangingAttachment = false;
		}
	}

	public addListener<TEvent extends keyof ProtocolMapping.Events>(
		method: TEvent,
		listener: (params: ProtocolMapping.Events[TEvent][0]) => Promise<void>
	): () => void {
		const innerListener = (
			source: chrome.debugger.Debuggee,
			incomingMethod: string,
			params?: object
		) => {
			if (source.tabId !== this.#tabId || incomingMethod !== method) {
				return;
			}

			return listener(params as ProtocolMapping.Events[TEvent][0]);
		};

		chrome.debugger.onEvent.addListener(innerListener);

		const remover = () =>
			void chrome.debugger.onEvent.removeListener(innerListener);

		this.#listenerRemovers.push(remover);

		return remover;
	}

	public removeAllListeners(): void {
		this.#listenerRemovers.forEach((remover) => remover());
	}

	public async sendCommand<TMethod extends keyof ParameterlessCommands>(
		method: TMethod
	): Promise<ProtocolMapping.Commands[TMethod]["returnType"]>;
	public async sendCommand<TMethod extends keyof ProtocolMapping.Commands>(
		method: TMethod,
		params: ProtocolMapping.Commands[TMethod]["paramsType"][0]
	): Promise<ProtocolMapping.Commands[TMethod]["returnType"]>;
	public async sendCommand<TMethod extends keyof ProtocolMapping.Commands>(
		method: TMethod,
		params?: ProtocolMapping.Commands[TMethod]["paramsType"][0]
	): Promise<ProtocolMapping.Commands[TMethod]["returnType"]> {
		return (await chrome.debugger.sendCommand(
			this.#target,
			method,
			params
		)) as ProtocolMapping.Commands[TMethod]["returnType"];
	}
}
