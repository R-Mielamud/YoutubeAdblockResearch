import * as puppeteer from "puppeteer";
import { ICDPSession } from "@/abstract";

export class PuppeteerCDPSession implements ICDPSession {
	#puppeteerSession: puppeteer.CDPSession;
	#attached = false;
	#isChangingAttachment = false;

	public constructor(puppeteerSession: puppeteer.CDPSession) {
		this.#puppeteerSession = puppeteerSession;
	}

	public get isAttached() {
		return this.#attached;
	}

	public async attach(): Promise<void> {
		if (this.#attached || this.#isChangingAttachment) {
			return;
		}

		this.#isChangingAttachment = true;

		try {
			await this.sendCommand("Debugger.enable");
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
			await this.sendCommand("Debugger.disable");
			this.#attached = false;
		} finally {
			this.#isChangingAttachment = false;
		}
	}

	public addListener<TEvent extends CDP.AnyEvent>(
		method: TEvent,
		listener: (params: CDP.Params<TEvent>) => Promise<void>
	): () => void {
		const innerListener: Parameters<puppeteer.CDPSession["on"]>[1] = (
			params
		) => listener(params as CDP.Params<TEvent>);

		this.#puppeteerSession.on(method, innerListener);

		return () => void this.#puppeteerSession.off(method, innerListener);
	}

	public removeAllListeners(): void {
		this.#puppeteerSession.removeAllListeners();
	}

	public sendCommand<TMethod extends CDP.ParameterlessMethod>(
		method: TMethod
	): Promise<CDP.MethodReturn<TMethod>>;
	public sendCommand<TMethod extends CDP.AnyMethod>(
		method: TMethod,
		params: CDP.Params<TMethod>
	): Promise<CDP.MethodReturn<TMethod>>;
	public sendCommand<TMethod extends CDP.AnyMethod>(
		method: TMethod,
		params?: CDP.Params<TMethod>
	): Promise<CDP.MethodReturn<TMethod>> {
		return this.#puppeteerSession.send(
			method,
			(params === null ? undefined : params) as
				| NonNullable<CDP.MethodReturn<TMethod>>
				| undefined
		) as Promise<CDP.MethodReturn<TMethod>>;
	}
}
