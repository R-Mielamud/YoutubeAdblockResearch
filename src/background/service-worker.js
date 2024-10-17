// const targetScriptRegex = /test\.html/;
// const endpointLocation = { lineNumber: 19, columnNumber: 0 };

const targetScriptRegex = /player_ias\.vflset\/.*?\/base\.js/;
const endpointLocation = { lineNumber: 9877, columnNumber: 18 };

function getDetailedType(value) {
	return value === null
		? "null"
		: Array.isArray(value)
		? "array"
		: typeof value;
}

function isDeepEqual(obj1, obj2) {
	const type1 = getDetailedType(obj1);
	const type2 = getDetailedType(obj2);

	if (type1 !== type2) {
		return false;
	}

	if (type1 === "object") {
		return (
			Object.keys(obj1).length &&
			Object.keys(obj2).length &&
			Object.entries(obj1).every(([key, value]) =>
				isDeepEqual(value, obj2[key])
			)
		);
	} else if (type1 === "array") {
		return (
			obj1.length === obj2.length &&
			obj1.every((element, i) => isDeepEqual(element, obj2[i]))
		);
	} else {
		return obj1 === obj2;
	}
}

class TargetWorker {
	#targetTabId;
	#onEventBound;
	#attached = false;
	#breakpointsSet = false;
	#canStartMapping = false;
	#firstMappingParams = null;
	#callTrie;
	#currentCallStackDepth;
	#beganMapping = false;

	constructor(targetTabId) {
		this.#targetTabId = targetTabId;
		this.#onEventBound = this.#onEvent.bind(this);

		this.#callTrie = {
			type: "root",
			frame: {},
			actions: [],
			children: [],
		};
	}

	start() {
		this.#attach();
	}

	get #target() {
		return { tabId: this.#targetTabId };
	}

	async #attach() {
		if (this.#attached) {
			return;
		}

		this.#attached = true;
		chrome.debugger.onEvent.addListener(this.#onEventBound);
		await chrome.debugger.attach(this.#target, "1.3");
		await chrome.debugger.sendCommand(this.#target, "Debugger.enable");

		console.log(`Attached to target: ${this.#targetTabId}`);
	}

	async #detach() {
		if (!this.#attached) {
			return;
		}

		this.#attached = false;
		chrome.debugger.onEvent.removeListener(this.#onEventBound);
		await chrome.debugger.detach(this.#target);

		console.log(`Detached from target: ${this.#targetTabId}`);
	}

	#onEvent(source, method, params) {
		if (source.tabId !== this.#targetTabId) {
			return;
		}

		console.log(method, params);

		switch (method) {
			case "Debugger.scriptParsed": {
				return this.#handleScriptParsed(params);
			}
			case "Debugger.paused": {
				return this.#handlePaused(params);
			}
		}
	}

	async #handleScriptParsed(params) {
		if (!targetScriptRegex.test(params.url)) {
			return;
		}

		await chrome.debugger.sendCommand(
			this.#target,
			"Debugger.setBreakpoint",
			{
				location: {
					scriptId: params.scriptId,
					...endpointLocation,
				},
			}
		);

		await chrome.debugger.sendCommand(
			this.#target,
			"DOMDebugger.setXHRBreakpoint",
			{ url: "" }
		);

		this.#breakpointsSet = true;

		if (this.#canStartMapping) {
			await this.#map(this.#firstMappingParams);
		}
	}

	async #handlePaused(params) {
		if (!this.#breakpointsSet) {
			this.#canStartMapping = true;
			this.#firstMappingParams = params;
		} else {
			await this.#map(params);
		}
	}

	async #map(params) {
		const shouldContinue = this.#maybeProcessCallStack(params);

		if (shouldContinue) {
			await chrome.debugger.sendCommand(
				this.#target,
				"Debugger.stepInto"
			);
		} else {
			this.#reportResults();
			await this.#detach();
		}
	}

	#maybeProcessCallStack(params) {
		const allCallFrames = params.callFrames.map((frame) => ({
			type: "normal",
			frame,
		}));

		let currentAsyncStackTrace = params.asyncStackTrace;

		while (currentAsyncStackTrace) {
			allCallFrames.push({
				type: "builtin",
				frame: {
					name: currentAsyncStackTrace.description,
				},
			});

			allCallFrames.push(
				...currentAsyncStackTrace.callFrames.map((frame) => ({
					type: "async",
					frame,
				}))
			);

			currentAsyncStackTrace = currentAsyncStackTrace.parent;
		}

		const actions = this.#getCallStackActions(params);
		const shouldContinue = params.hitBreakpoints.length === 0;

		const nothingToDo =
			allCallFrames.length === this.#currentCallStackDepth &&
			actions.length === 0;

		if (!this.#beganMapping) {
			this.#currentCallStackDepth = allCallFrames.length;
			this.#beganMapping = true;
		} else if (nothingToDo) {
			return shouldContinue;
		}

		this.#currentCallStackDepth = allCallFrames.length;
		this.#addCallStackToTrie(allCallFrames, actions);

		return shouldContinue;
	}

	#addCallStackToTrie(callFrames, actions) {
		let currentTrieNode = this.#callTrie;

		callFrames.reverse().forEach(({ type, frame }) => {
			const trieFrame = this.#rawFrameToTrieFrame(type, frame);

			const nextTrieNode = currentTrieNode.children.find((child) => {
				if (child.type !== type) {
					return false;
				}

				if (isDeepEqual(child.frame, trieFrame)) {
					return true;
				}

				return false;
			});

			if (nextTrieNode) {
				currentTrieNode = nextTrieNode;
			} else {
				const newNode = {
					type,
					frame: trieFrame,
					actions: [],
					children: [],
				};

				currentTrieNode.children.push(newNode);
				currentTrieNode = newNode;
			}
		});

		currentTrieNode.actions.push(...actions);
	}

	#getCallStackActions(params) {
		if (params.reason !== "ambiguous") {
			return [];
		}

		return params.data.reasons
			.map((reasonDescription) =>
				reasonDescription.reason === "XHR"
					? { type: "webRequest", url: reasonDescription.auxData.url }
					: null
			)
			.filter(Boolean);
	}

	#rawFrameToTrieFrame(type, frame) {
		switch (type) {
			case "normal": {
				const { functionName: name, functionLocation } = frame;

				return { name, functionLocation };
			}
			case "async": {
				const {
					functionName: name,
					columnNumber,
					lineNumber,
					scriptId,
				} = frame;

				return {
					name,
					location: { columnNumber, lineNumber, scriptId },
				};
			}
			case "builtin": {
				return frame;
			}
		}
	}

	#reportResults() {
		console.dir(this.#callTrie);
	}
}

chrome.action.onClicked.addListener((tab) => new TargetWorker(tab.id).start());
