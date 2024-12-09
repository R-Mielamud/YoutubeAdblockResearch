import { TraceEvent } from "./trace-event.type";

export type RawProfile = {
	profile?: TraceEvent;
	chunks: TraceEvent[];
};
