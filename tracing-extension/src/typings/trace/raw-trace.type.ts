import { TraceEvent } from "./trace-event.type";

export type RawTrace = Record<string, any> & {
	traceEvents: TraceEvent[];
};
