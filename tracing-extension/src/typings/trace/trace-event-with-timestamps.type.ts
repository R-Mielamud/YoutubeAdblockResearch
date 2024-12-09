import { TimeInterval } from "./time-interval.type";
import { TraceEvent } from "./trace-event.type";

export type TraceEventWithTimestamps = TimeInterval & {
	event: TraceEvent;
};
