import {
	ProfileFrame,
	ProfileSample,
	TraceEvent,
	TraceEventWithTimestamps,
} from "src/typings";

import { isJSInvocationEvent } from "src/trace-viewer/helpers";
import { Profile, ProfileCall, ProfileNode } from "../models";

export class ProfileCallsParser {
	#profile: Profile;
	#otherEvents: TraceEvent[];
	#completeEvents: TraceEventWithTimestamps[];
	#frames: ProfileFrame[];
	#eventStack: TraceEventWithTimestamps[] = [];
	#callStack: ProfileCall[] = [];
	#callStackPins: number[] = [];
	#calls: ProfileCall[] = [];
	#fakeJSInvocation = false;

	private constructor(profile: Profile, otherEvents: TraceEvent[]) {
		this.#profile = profile;
		this.#otherEvents = otherEvents;
		this.#completeEvents = this.#getCompleteEvents();
		this.#frames = this.#getFrames();
	}

	public static parse(
		profile: Profile,
		otherEvents: TraceEvent[]
	): ProfileCall[] {
		return new ProfileCallsParser(profile, otherEvents).#parse();
	}

	#getCompleteEvents(): TraceEventWithTimestamps[] {
		const completeEvents: TraceEventWithTimestamps[] = [];
		const beginEventsStack: TraceEventWithTimestamps[] = [];

		this.#otherEvents.forEach((event) => {
			if (event.ph === "X") {
				completeEvents.push({
					event,
					startTime: event.ts,
					endTime: event.ts + (event.dur ?? 0),
				});
			} else if (event.ph === "B") {
				const eventWithTimestamps: TraceEventWithTimestamps = {
					event: {
						...event,
						ph: "X",
					},
					startTime: event.ts,
					endTime: event.ts,
				};

				completeEvents.push(eventWithTimestamps);
				beginEventsStack.push(eventWithTimestamps);
			} else if (event.ph === "E") {
				const beginEvent = beginEventsStack.pop();

				if (
					!beginEvent ||
					beginEvent.event.cat !== event.cat ||
					beginEvent.event.name !== event.name
				) {
					throw new Error("Trace events not nested properly");
				}

				beginEvent.endTime = event.ts;
			}
		});

		return completeEvents;
	}

	#getFrames(): ProfileFrame[] {
		const eventFrames = this.#completeEvents.map((event) => ({
			...event,
			type: "event",
		}));

		const sampleFrames = this.#profile.samples.map((sample) => ({
			...sample,
			type: "sample",
		}));

		let eventIndex = 0;
		let sampleIndex = 0;

		const frames: ProfileFrame[] = [];

		while (
			eventIndex < eventFrames.length &&
			sampleIndex < sampleFrames.length
		) {
			const event = eventFrames[eventIndex] as ProfileFrame & {
				type: "event";
			};

			const sample = sampleFrames[sampleIndex] as ProfileFrame & {
				type: "sample";
			};

			if (event.startTime <= sample.timestamp) {
				frames.push(event);
				eventIndex++;
			} else {
				frames.push(sample);
				sampleIndex++;
			}
		}

		while (eventIndex < eventFrames.length) {
			frames.push(eventFrames[eventIndex++] as ProfileFrame);
		}

		while (sampleIndex < sampleFrames.length) {
			frames.push(sampleFrames[sampleIndex++] as ProfileFrame);
		}

		return frames;
	}

	#parse(): ProfileCall[] {
		this.#frames.forEach((frame) => {
			const frameStartTime =
				frame.type === "sample" ? frame.timestamp : frame.startTime;

			let parentEvent = this.#eventStack.at(-1);

			while (parentEvent && frameStartTime >= parentEvent.endTime) {
				this.#onEventEnd(parentEvent);
				this.#eventStack.pop();

				parentEvent = this.#eventStack.at(-1);
			}

			if (frame.type === "event") {
				this.#onEventStart(frame);
				this.#eventStack.push(frame);
			} else {
				this.#onSample(frame, parentEvent);
			}
		});

		while (this.#eventStack.length > 0) {
			this.#onEventEnd(
				this.#eventStack.pop() as TraceEventWithTimestamps
			);
		}

		const lastFrame = this.#frames.at(-1);

		const lastFrameEnd = lastFrame
			? lastFrame.type === "event"
				? lastFrame.endTime
				: lastFrame.timestamp
			: 0;

		this.#callStackPins = [];
		this.#truncateCallStack(0, lastFrameEnd);

		return this.#calls;
	}

	#onEventStart(event: TraceEventWithTimestamps) {
		if (["RunTask", "RunMicrotasks"].includes(event.event.name)) {
			this.#callStackPins = [];
			this.#truncateCallStack(0, event.startTime);
			this.#fakeJSInvocation = false;
		}

		if (this.#fakeJSInvocation) {
			this.#truncateCallStack(
				this.#callStackPins.pop() ?? 0,
				event.startTime
			);

			this.#fakeJSInvocation = false;
		}

		this.#callStackPins.push(this.#callStack.length);
	}

	#onEventEnd(event: TraceEventWithTimestamps) {
		const pin = this.#callStackPins.pop() ?? 0;
		this.#truncateCallStack(pin, event.endTime);
	}

	#onSample(sample: ProfileSample, parentEvent?: TraceEventWithTimestamps) {
		if (
			(parentEvent && isJSInvocationEvent(parentEvent.event)) ||
			this.#fakeJSInvocation
		) {
			this.#updateCallStack(sample);
		} else {
			const pin = this.#callStack.length;

			this.#fakeJSInvocation = true;
			this.#updateCallStack(sample);
			this.#callStackPins.push(pin);
		}
	}

	#updateCallStack(sample: ProfileSample): void {
		const garbageCollectorNode = this.#profile.garbageCollectorNode;
		const topCall = this.#callStack.at(-1);

		if (sample.node.id === garbageCollectorNode?.id) {
			if (topCall) {
				topCall.endTime = sample.timestamp;
			}

			return;
		}

		const pin = this.#callStackPins.at(-1) ?? 0;
		let index: number;

		const oldNodes = this.#callStack.map(({ node }) => node);
		const newNodes = sample.node.stack.filter((node) => !node.isMeta);
		const minLength = Math.min(oldNodes.length, newNodes.length);

		for (index = pin; index < minLength; index++) {
			const oldNode = oldNodes[index] as ProfileNode;
			const newNode = newNodes[index] as ProfileNode;

			if (oldNode.id !== newNode.id) {
				break;
			}
		}

		this.#truncateCallStack(index, sample.timestamp);

		for (; index < newNodes.length; index++) {
			const call = new ProfileCall({
				node: newNodes[index] as ProfileNode,
				parent: this.#callStack.at(-1),
				startTime: sample.timestamp,
				endTime: sample.timestamp,
				depth: index,
			});

			this.#callStack.push(call);
			this.#calls.push(call);
		}
	}

	#truncateCallStack(depth: number, timestamp: number): void {
		const pin = this.#callStackPins.at(-1) ?? 0;

		if (depth < pin || depth > this.#callStack.length) {
			throw new Error("Invalid call stack truncation depth");
		}

		this.#callStack.forEach((call) => {
			call.endTime = timestamp;
		});

		this.#callStack = this.#callStack.slice(0, depth);
	}
}
