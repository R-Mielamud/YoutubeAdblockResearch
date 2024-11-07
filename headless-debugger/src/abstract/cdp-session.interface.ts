export interface ICDPSession {
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
