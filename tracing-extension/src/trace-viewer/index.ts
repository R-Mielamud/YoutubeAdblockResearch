import { TraceScreenshot } from "src/typings";
import { clamp, percent } from "./helpers";
import { Trace } from "./trace-parsing";

type CreateElementOptions = {
	className?: string | string[];
	style?: Record<string, string>;
};

const createElement = <TTagName extends keyof HTMLElementTagNameMap>(
	tagName: TTagName,
	options?: CreateElementOptions
): HTMLElementTagNameMap[TTagName] => {
	const element = document.createElement(tagName);

	const classNamesList = Array.isArray(options?.className)
		? options.className
		: typeof options?.className === "string"
		? [options.className]
		: [];

	classNamesList.forEach((className) => element.classList.add(className));

	Object.entries(options?.style ?? {}).forEach(([property, value]) =>
		element.style.setProperty(property, value)
	);

	return element;
};

type AppOptions = {
	handleFunctionStrikes?: (strikes: Record<string, number>) => void;
};

type Segment = {
	startPos: number;
	endPos: number;
	$marker1: HTMLElement;
	$marker2: HTMLElement;
	$background: HTMLElement;
};

class App {
	#options?: AppOptions;
	#$main: HTMLElement;
	#$timeline: HTMLDivElement;
	#$ghostMarker: HTMLDivElement;
	#$screenshot: HTMLImageElement;
	#$functionCallsCount: HTMLSpanElement;
	#$submitButton: HTMLButtonElement;
	#trace?: Trace;

	#currentSegment?: {
		firstMarkerPos: number;
		$marker: HTMLElement;
		$background: HTMLElement;
	};

	#segments: Segment[] = [];

	public constructor(options?: AppOptions) {
		this.#options = options;
		this.#$main = document.getElementsByTagName("main")[0] as HTMLElement;
		this.#$timeline = document.getElementById("timeline") as HTMLDivElement;

		this.#$ghostMarker = document.getElementById(
			"ghost-marker"
		) as HTMLDivElement;

		this.#$screenshot = document.getElementById(
			"screenshot"
		) as HTMLImageElement;

		this.#$functionCallsCount = document.getElementById(
			"function-calls-count"
		) as HTMLSpanElement;

		this.#$submitButton = document.getElementById(
			"submit-button"
		) as HTMLButtonElement;

		this.#init();
	}

	public loadTrace(trace: Trace) {
		this.#abortCurrentSegment();
		this.#segments.forEach((segment) => this.#removeSegment(segment));

		this.#trace = trace;

		this.#$functionCallsCount.innerText = String(
			trace.functionCalls.length
		);

		this.#$main.classList.add("active");
	}

	get #isActive() {
		return Boolean(this.#trace);
	}

	#init() {
		this.#$timeline.addEventListener(
			"mousemove",
			this.#handleTimelineMouseMove
		);

		this.#$timeline.addEventListener("click", this.#handleTimelineClick);
		this.#$submitButton.addEventListener("click", this.#handleSubmit);

		document.body.addEventListener("keydown", this.#handleKeyPress);
	}

	#handleTimelineMouseMove = (event: MouseEvent) => {
		if (!this.#isActive) {
			return;
		}

		const markerPos = this.#getTimelineRelativePos(event.x);

		this.#$ghostMarker.style.setProperty("--left", percent(markerPos));

		const screenshot = this.#getScreenshotAtPos(markerPos);

		if (screenshot) {
			this.#$screenshot.setAttribute(
				"src",
				`data:image/png;base64,${screenshot.base64}`
			);
		} else if (this.#$screenshot.hasAttribute("src")) {
			this.#$screenshot.removeAttribute("src");
		}

		if (this.#currentSegment) {
			this.#currentSegment.$background.style.setProperty(
				"--left",
				percent(
					Math.min(markerPos, this.#currentSegment.firstMarkerPos)
				)
			);

			this.#currentSegment.$background.style.setProperty(
				"width",
				percent(
					Math.abs(this.#currentSegment.firstMarkerPos - markerPos)
				)
			);
		}
	};

	#handleTimelineClick = (event: MouseEvent) => {
		if (!this.#isActive) {
			return;
		}

		const markerPos = this.#getTimelineRelativePos(event.x);
		const $marker = this.#addMarker(markerPos);

		if (this.#currentSegment) {
			const [startPos, endPos] = [
				Math.min(markerPos, this.#currentSegment.firstMarkerPos),
				Math.max(markerPos, this.#currentSegment.firstMarkerPos),
			];

			this.#segments.push({
				startPos,
				endPos,
				$marker1: this.#currentSegment.$marker,
				$marker2: $marker,
				$background: this.#currentSegment.$background,
			});

			this.#currentSegment = undefined;
		} else {
			this.#currentSegment = {
				firstMarkerPos: markerPos,
				$marker: $marker,
				$background: this.#addSegmentBackground(markerPos),
			};
		}
	};

	#handleSubmit = () => {
		const functionStrikes: Record<string, number> = {};

		(this.#trace as Trace).functionCalls.forEach((call) => {
			const callPos = this.#getEventPos(call.startTime);

			const isMarked = this.#segments.some(
				({ startPos, endPos }) =>
					callPos >= startPos && callPos <= endPos
			);

			if (isMarked) {
				const { lineNumber, columnNumber, url, functionName } =
					call.node;

				const signature = `${url}:${lineNumber}:${columnNumber}:${
					functionName || "(anonymous)"
				}`;

				if (!functionStrikes.hasOwnProperty(signature)) {
					functionStrikes[signature] = 0;
				}

				(functionStrikes[signature] as number) += 1;
			}
		});

		this.#options?.handleFunctionStrikes?.(functionStrikes);
		this.#$main.classList.remove("active");
	};

	#handleKeyPress = (event: KeyboardEvent) => {
		if (!this.#isActive) {
			return;
		}

		switch (event.key) {
			case "Escape": {
				return this.#abortCurrentSegment();
			}
			case "Backspace": {
				return this.#removeLastSegment();
			}
		}
	};

	#getTimelineRelativePos(absoluteX: number) {
		const timelineRect = this.#$timeline.getBoundingClientRect();

		return clamp(0, (absoluteX - timelineRect.x) / timelineRect.width, 1);
	}

	#addMarker(markerPos: number) {
		const $marker = createElement("div", {
			className: "marker",
			style: {
				"--left": percent(markerPos),
			},
		});

		this.#$timeline.append($marker);

		return $marker;
	}

	#addSegmentBackground(markerPos: number) {
		const $background = createElement("div", {
			className: "segment-background",
			style: {
				"--left": percent(markerPos),
			},
		});

		this.#$timeline.append($background);

		return $background;
	}

	#abortCurrentSegment() {
		if (this.#currentSegment) {
			this.#currentSegment.$marker.remove();
			this.#currentSegment.$background.remove();
			this.#currentSegment = undefined;
		}
	}

	#removeLastSegment() {
		const segment = this.#segments.pop();

		if (!segment) {
			return;
		}

		this.#removeSegment(segment);
	}

	#removeSegment(segment: Segment) {
		segment.$marker1.remove();
		segment.$marker2.remove();
		segment.$background.remove();
	}

	#getScreenshotAtPos(pos: number): TraceScreenshot | undefined {
		if (!this.#isActive) {
			return;
		}

		const { screenshots } = this.#trace as Trace;

		if (!screenshots.length) {
			return;
		}

		let rangeStart = 0;
		let rangeEnd = screenshots.length;

		while (rangeEnd - rangeStart > 2) {
			const rangeMiddle = (rangeStart + rangeEnd) >> 1;

			const middleScreenshot = screenshots[
				rangeMiddle
			] as TraceScreenshot;

			const screenshotPos = this.#getEventPos(middleScreenshot.timestamp);

			if (pos < screenshotPos) {
				rangeEnd = rangeMiddle + 1;
			} else {
				rangeStart = rangeMiddle;
			}
		}

		if (rangeEnd - rangeStart === 1) {
			return screenshots[rangeStart];
		} else {
			const option1 = screenshots[rangeStart] as TraceScreenshot;
			const option2 = screenshots[rangeStart + 1] as TraceScreenshot;
			const pos1 = this.#getEventPos(option1.timestamp);
			const pos2 = this.#getEventPos(option2.timestamp);
			const distance1 = Math.abs(pos1 - pos);
			const distance2 = Math.abs(pos2 - pos);

			return distance1 < distance2 ? option1 : option2;
		}
	}

	#getEventPos(timestamp: number) {
		if (!this.#isActive) {
			throw new Error("Trace not found");
		}

		const { startTime, endTime } = this.#trace as Trace;

		return (timestamp - startTime) / (endTime - startTime);
	}
}

const main = async () => {
	const port = chrome.runtime.connect({ name: "trace-viewer" });

	const app = new App({
		handleFunctionStrikes: (strikes) => {
			console.log("strikes", strikes);

			port.postMessage({ type: "strikes", strikes });
		},
	});

	let incomingTrace: string = "";

	port.onMessage.addListener((message) => {
		if (!message) {
			return;
		}

		switch (message.type) {
			case "trace-start": {
				incomingTrace = "";
				break;
			}
			case "trace-chunk": {
				incomingTrace += message.chunk;
				break;
			}
			case "trace-end": {
				const trace = new Trace(JSON.parse(incomingTrace));
				app.loadTrace(trace);

				incomingTrace = "";

				break;
			}
		}
	});
};

main();
