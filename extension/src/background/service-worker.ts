interface ICDPSession {
	isAttached: boolean;

	attach(): Promise<void>;

	detach(): Promise<void>;

	addListener<TEvent extends CDP.AnyEvent>(
		method: TEvent,
		listener: (params: CDP.Params<TEvent>) => Promise<void>
	): () => void;

	removeAllListeners(): void;

	sendCommand<TMethod extends CDP.ParameterlessMethod>(
		method: TMethod
	): Promise<CDP.MethodReturn<TMethod>>;
	sendCommand<TMethod extends CDP.AnyMethod>(
		method: TMethod,
		params: CDP.Params<TMethod>
	): Promise<CDP.MethodReturn<TMethod>>;
}

interface ILogger {
	logInfoMessage(message: string): void;

	logIntermediateResult(data: any): void;
}

class ChromeExtensionCDPSession implements ICDPSession {
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
			this.removeAllListeners();
			await chrome.debugger.detach(this.#target);

			this.#attached = false;
		} finally {
			this.#isChangingAttachment = false;
		}
	}

	public addListener<TEvent extends CDP.AnyEvent>(
		method: TEvent,
		listener: (params: CDP.Params<TEvent>) => Promise<void>
	): () => void {
		const innerListener = (
			source: chrome.debugger.Debuggee,
			incomingMethod: string,
			params?: object
		) => {
			if (source.tabId !== this.#tabId || incomingMethod !== method) {
				return;
			}

			return listener(params as CDP.Params<TEvent>);
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

	public async sendCommand<TMethod extends CDP.ParameterlessMethod>(
		method: TMethod
	): Promise<CDP.MethodReturn<TMethod>>;
	public async sendCommand<TMethod extends CDP.AnyMethod>(
		method: TMethod,
		params: CDP.Params<TMethod>
	): Promise<CDP.MethodReturn<TMethod>>;
	public async sendCommand<TMethod extends CDP.AnyMethod>(
		method: TMethod,
		params?: CDP.Params<TMethod>
	): Promise<CDP.MethodReturn<TMethod>> {
		return (await chrome.debugger.sendCommand(
			this.#target,
			method,
			(params === null ? undefined : params) as
				| NonNullable<typeof params>
				| undefined
		)) as CDP.MethodReturn<TMethod>;
	}
}

class ConsoleLogger implements ILogger {
	public logInfoMessage(message: string): void {
		console.log(message);
	}

	public logIntermediateResult(data: any): void {
		console.log(data);
	}
}

class TargetWorker {
	#finishLocation: CDP.Debugger.SetBreakpointByURL.Params;
	#cdpSession: ICDPSession;
	#logger: ILogger;
	#breakpointsSet = false;
	#firstPause: CDP.Debugger.Paused.Params | null = null;

	public constructor(
		finishLocation: CDP.Debugger.SetBreakpointByURL.Params,
		cdpSession: ICDPSession,
		logger: ILogger
	) {
		this.#finishLocation = finishLocation;
		this.#cdpSession = cdpSession;
		this.#logger = logger;
	}

	public start(): Promise<void> {
		return this.#attach();
	}

	async #attach(): Promise<void> {
		if (this.#cdpSession.isAttached) {
			return;
		}

		this.#breakpointsSet = false;

		this.#cdpSession.addListener(
			"Debugger.paused",
			this.#onPaused.bind(this)
		);

		await this.#cdpSession.attach();

		await this.#cdpSession.sendCommand(
			"Debugger.setBreakpointByUrl",
			this.#finishLocation
		);

		await this.#cdpSession.sendCommand("DOMDebugger.setXHRBreakpoint", {
			url: "",
		});

		this.#logger.logInfoMessage("Attached to target");

		this.#breakpointsSet = true;

		if (this.#firstPause) {
			await this.#onPaused(this.#firstPause);
		}
	}

	async #detach(): Promise<void> {
		if (!this.#cdpSession.isAttached) {
			return;
		}

		await this.#cdpSession.detach();

		this.#logger.logInfoMessage("Detached from target");
	}

	async #onPaused(params: CDP.Debugger.Paused.Params): Promise<void> {
		if (!this.#breakpointsSet) {
			this.#firstPause = params;
			return;
		}

		const shouldContinue = await this.#processPause(params);

		if (shouldContinue) {
			await this.#cdpSession.sendCommand("Debugger.stepInto");
		} else {
			await this.#detach();
		}
	}

	async #processPause(params: CDP.Debugger.Paused.Params): Promise<boolean> {
		this.#logger.logIntermediateResult(params);

		return !params.hitBreakpoints?.length;
	}
}

const finishLocation = {
	urlRegex: "test\\.html",
	lineNumber: 19,
	columnNumber: 0,
};

// const finishLocation = {
// 	urlRegex: "player_ias\\.vflset\\/.*?\\/base\\.js",
// 	lineNumber: 9877,
// 	columnNumber: 18,
// };

chrome.action.onClicked.addListener((tab) =>
	new TargetWorker(
		finishLocation,
		new ChromeExtensionCDPSession(tab.id as number),
		new ConsoleLogger()
	).start()
);
