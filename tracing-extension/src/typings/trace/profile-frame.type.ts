import { ProfileSample } from "./profile-sample.type";
import { TraceEventWithTimestamps } from "./trace-event-with-timestamps.type";

export type ProfileFrame =
	| (ProfileSample & { type: "sample" })
	| (TraceEventWithTimestamps & { type: "event" });
