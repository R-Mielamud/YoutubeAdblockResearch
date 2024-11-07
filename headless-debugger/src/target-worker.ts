import { ILogger, ICDPSession } from "@/abstract";
import { hasIntersection, Task } from "@/helpers";

export class TargetWorker {
	#startBreakpointIds: CDP.Debugger.BreakpointId[] = [];
	#finishBreakpointIds: CDP.Debugger.BreakpointId[] = [];
	#hitStartBreakpoint = false;
	#cdpSession: ICDPSession;
	#logger: ILogger;
	#breakpointsSet = false;
	#firstPause: CDP.Debugger.Paused.Params | null = null;
	#workEndTask: Task<void> | null = null;

	public constructor(cdpSession: ICDPSession, logger: ILogger) {
		this.#cdpSession = cdpSession;
		this.#logger = logger;
	}

	public async start(
		startLocations: CDP.Debugger.SetBreakpointByURL.Params[],
		finishLocations: CDP.Debugger.SetBreakpointByURL.Params[]
	): Promise<Task<void>> {
		if (this.#workEndTask) {
			return this.#workEndTask;
		}

		await this.#attach(startLocations, finishLocations);
		this.#workEndTask = new Task<void>();

		return this.#workEndTask;
	}

	async #attach(
		startLocations: CDP.Debugger.SetBreakpointByURL.Params[],
		finishLocations: CDP.Debugger.SetBreakpointByURL.Params[]
	): Promise<void> {
		if (this.#cdpSession.isAttached) {
			return;
		}

		this.#breakpointsSet = false;

		this.#cdpSession.addListener(
			"Debugger.paused",
			this.#onPaused.bind(this)
		);

		await this.#cdpSession.attach();
		await this.#setBaseBreakpoints(startLocations, finishLocations);

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
		this.#workEndTask?.resolve();
	}

	async #onPaused(params: CDP.Debugger.Paused.Params): Promise<void> {
		if (!this.#breakpointsSet) {
			this.#firstPause = params;
			return;
		}

		if (
			!this.#hitStartBreakpoint &&
			params.hitBreakpoints &&
			hasIntersection(params.hitBreakpoints, this.#startBreakpointIds)
		) {
			this.#hitStartBreakpoint = true;
			await this.#setAdditionalBreakpoints();
		}

		if (!this.#hitStartBreakpoint) {
			await this.#stepDebugger();

			return;
		}

		await this.#processPause(params);

		if (
			params.hitBreakpoints &&
			hasIntersection(params.hitBreakpoints, this.#finishBreakpointIds)
		) {
			await this.#detach();
		} else {
			await this.#stepDebugger();
		}
	}

	async #processPause(params: CDP.Debugger.Paused.Params): Promise<void> {
		this.#logger.logIntermediateResult(params);
	}

	async #setBaseBreakpoints(
		startLocations: CDP.Debugger.SetBreakpointByURL.Params[],
		finishLocations: CDP.Debugger.SetBreakpointByURL.Params[]
	): Promise<void> {
		this.#startBreakpointIds = await this.#setManyBreakpoints(
			startLocations
		);

		this.#finishBreakpointIds = await this.#setManyBreakpoints(
			finishLocations
		);
	}

	async #setAdditionalBreakpoints(): Promise<void> {
		await this.#cdpSession.sendCommand("DOMDebugger.setXHRBreakpoint", {
			url: "",
		});
	}

	async #stepDebugger(): Promise<void> {
		await this.#cdpSession.sendCommand("Debugger.stepInto");
	}

	async #setManyBreakpoints(
		locations: CDP.Debugger.SetBreakpointByURL.Params[]
	): Promise<CDP.Debugger.BreakpointId[]> {
		return (
			await Promise.all(
				locations.map((location) =>
					this.#cdpSession.sendCommand(
						"Debugger.setBreakpointByUrl",
						location
					)
				)
			)
		).map(({ breakpointId }) => breakpointId);
	}
}
