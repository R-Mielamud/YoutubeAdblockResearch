export class Task<T> {
	#promise: Promise<T>;
	#resolve!: (result: T) => void;
	#reject!: (err?: Error) => void;

	public constructor() {
		this.#promise = new Promise<T>((resolve, reject) => {
			this.#resolve = resolve;
			this.#reject = reject;
		});
	}

	public get promise() {
		return this.#promise;
	}

	public get resolve() {
		return this.#resolve;
	}

	public get reject() {
		return this.#reject;
	}
}
