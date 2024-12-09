import { RawProfile, RawTrace, TraceEvent, TraceScreenshot } from "src/typings";
import { ProfileCall } from "./profile-call.model";
import { ProfileCallsParser } from "../profile-calls-parser";
import { Profile } from "./profile.model";

export class Trace {
	public functionCalls: ProfileCall[];
	public screenshots: TraceScreenshot[];
	public startTime: number;
	public endTime: number;

	public constructor(public rawTrace: RawTrace) {
		this.functionCalls = this.#getFunctionCalls();
		this.screenshots = this.#getScreenshots();

		const eventTimestamps = rawTrace.traceEvents
			.map(({ ts }) => ts)
			.filter((ts) => ts !== 0);

		this.startTime = eventTimestamps[0] ?? 0;
		this.endTime = eventTimestamps[0] ?? 0;

		eventTimestamps.forEach((timestamp) => {
			this.startTime = Math.min(this.startTime, timestamp);
			this.endTime = Math.max(this.endTime, timestamp);
		});
	}

	#getFunctionCalls(): ProfileCall[] {
		const eventsPerThread = new Map<number, Map<number, TraceEvent[]>>();
		const profiles = new Map<number, Map<string, RawProfile>>();

		this.rawTrace.traceEvents.map((event) => {
			const { pid: processId, tid: threadId, name } = event;

			if (name === "Profile" || name === "ProfileChunk") {
				const id = event.id as string;

				if (!profiles.has(processId)) {
					profiles.set(processId, new Map<string, RawProfile>());
				}

				const processProfiles = profiles.get(processId) as Map<
					string,
					RawProfile
				>;

				if (!processProfiles.has(id)) {
					processProfiles.set(id, { chunks: [] });
				}

				const rawProfile = processProfiles.get(id) as RawProfile;

				if (name === "Profile") {
					rawProfile.profile = event;
				} else {
					rawProfile.chunks.push(event);
				}
			} else {
				if (!eventsPerThread.has(processId)) {
					eventsPerThread.set(
						processId,
						new Map<number, TraceEvent[]>()
					);
				}

				const processEvents = eventsPerThread.get(processId) as Map<
					number,
					TraceEvent[]
				>;

				if (!processEvents.has(threadId)) {
					processEvents.set(threadId, []);
				}

				const threadEvents = processEvents.get(
					threadId
				) as TraceEvent[];

				threadEvents.push(event);
			}
		});

		const allCalls: ProfileCall[] = [];

		profiles.forEach((processProfiles) =>
			processProfiles.forEach(({ profile: profileEvent, chunks }) => {
				if (!profileEvent) {
					return;
				}

				const profile = new Profile(profileEvent, chunks);

				const calls = ProfileCallsParser.parse(
					profile,
					eventsPerThread
						.get(profileEvent.pid)
						?.get(profileEvent.tid) ?? []
				);

				allCalls.push(...calls);
			})
		);

		return allCalls;
	}

	#getScreenshots(): TraceScreenshot[] {
		const screenshots = this.rawTrace.traceEvents
			.filter((event) => event.name === "Screenshot")
			.map((event) => ({
				base64: event.args.snapshot,
				timestamp: event.ts,
			}));

		screenshots.sort((a, b) => a.timestamp - b.timestamp);

		return screenshots;
	}
}
