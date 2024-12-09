import { ProfileSample, RawProfileNode, TraceEvent } from "src/typings";
import { ProfileNode } from "./profile-node.model";

export class Profile {
	public nodes = new Map<number, ProfileNode>();
	public rawSamples: number[];
	public sampleTimestamps: number[];
	public samples: ProfileSample[];
	public rootNode?: ProfileNode;
	public idleNode?: ProfileNode;
	public programNode?: ProfileNode;
	public garbageCollectorNode?: ProfileNode;

	public constructor(
		public profileEvent: TraceEvent,
		public chunkEvents: TraceEvent[]
	) {
		const {
			nodes: rawNodes,
			samples: rawSamples,
			timeDeltas,
		} = this.#mergeProfileChunks();

		this.rawSamples = rawSamples;

		this.sampleTimestamps = this.#timeDeltasToTimestamps(
			profileEvent.ts,
			timeDeltas
		);

		this.#addNodesToMap(
			rawNodes.map((rawNode) => new ProfileNode(rawNode))
		);

		this.#buildNodeTree();

		const {
			root: rootNode,
			idle: idleNode,
			program: programNode,
			garbageCollector: garbageCollectorNode,
		} = this.#findMetaNodes();

		this.rootNode = rootNode;
		this.idleNode = idleNode;
		this.programNode = programNode;
		this.garbageCollectorNode = garbageCollectorNode;

		this.samples = this.#parseRawSamples();

		this.#fixMissingSamples();
	}

	#mergeProfileChunks(): {
		nodes: RawProfileNode[];
		samples: number[];
		timeDeltas: number[];
	} {
		const nodes: RawProfileNode[] = [];
		const samples: number[] = [];
		const timeDeltas: number[] = [];

		this.chunkEvents.forEach((chunk) => {
			nodes.push(...(chunk.args?.data?.cpuProfile?.nodes ?? []));
			samples.push(...(chunk.args?.data?.cpuProfile?.samples ?? []));
			timeDeltas.push(...(chunk.args?.data?.timeDeltas ?? []));
		});

		return { nodes, samples, timeDeltas };
	}

	#timeDeltasToTimestamps(startTime: number, timeDeltas: number[]): number[] {
		let currentTime: number = startTime;

		return timeDeltas.map((delta) => {
			currentTime += delta;

			return currentTime;
		});
	}

	#addNodesToMap(newNodes: ProfileNode[]): void {
		newNodes.forEach((node) => {
			if (this.nodes.has(node.id)) {
				throw new Error(`Duplicate node id: ${node.id}`);
			}

			this.nodes.set(node.id, node);
		});
	}

	#buildNodeTree(): void {
		const nodesToVisit: ProfileNode[] = [];

		this.nodes.forEach((node) => {
			node.parent =
				typeof node.parentId === "number"
					? this.nodes.get(node.parentId)
					: undefined;

			if (!node.parent) {
				nodesToVisit.push(node);
			} else {
				node.parent.children.push(node);
			}
		});

		while (nodesToVisit.length) {
			const node = nodesToVisit.pop() as ProfileNode;

			node.depth = (node.parent?.depth ?? -1) + 1;
			nodesToVisit.push(...node.children);
		}
	}

	#parseRawSamples(): ProfileSample[] {
		if (this.rawSamples.length !== this.sampleTimestamps.length) {
			throw new Error(
				"Number of raw samples different from number of timestamps"
			);
		}

		const sortedTimestampIndexes = this.sampleTimestamps.map(
			(_, index) => index
		);

		sortedTimestampIndexes.sort(
			(a, b) =>
				(this.sampleTimestamps[a] as number) -
				(this.sampleTimestamps[b] as number)
		);

		const sortedRawSamples = sortedTimestampIndexes.map(
			(index) => this.rawSamples[index] as number
		);

		const sortedTimestamps = sortedTimestampIndexes.map(
			(index) => this.sampleTimestamps[index] as number
		);

		const samples: ProfileSample[] = sortedRawSamples
			.map((nodeId, index) => ({
				timestamp: sortedTimestamps[index] as number,
				node: this.nodes.get(nodeId) as ProfileNode,
			}))
			.map((sample, index, samples) => {
				if (index === 0 || index === samples.length - 1) {
					return sample;
				}

				const prevNode = (samples[index - 1] as ProfileSample).node;
				const nextNode = (samples[index + 1] as ProfileSample).node;

				if (
					sample.node.isProgram &&
					prevNode.stackBottom.id === nextNode.stackBottom.id &&
					!prevNode.isMeta &&
					!nextNode.isMeta
				) {
					sample.node = prevNode;
				}

				return sample;
			});

		return samples;
	}

	#findMetaNodes(): Record<
		"root" | "idle" | "program" | "garbageCollector",
		ProfileNode | undefined
	> {
		let root: ProfileNode | undefined;
		let idle: ProfileNode | undefined;
		let program: ProfileNode | undefined;
		let garbageCollector: ProfileNode | undefined;

		this.nodes.forEach((node) => {
			if (node.isRoot) {
				root = node;
			} else if (node.isIdle) {
				idle = node;
			} else if (node.isProgram) {
				program = node;
			} else if (node.isGarbageCollector) {
				garbageCollector = node;
			}
		});

		return { root, idle, program, garbageCollector };
	}

	#fixMissingSamples(): void {
		this.samples.forEach((sample, index) => {
			if (index === 0 || index === this.samples.length - 1) {
				return;
			}

			const prevNode = (this.samples[index - 1] as ProfileSample).node;
			const nextNode = (this.samples[index + 1] as ProfileSample).node;

			if (
				sample.node.id === this.programNode?.id &&
				!prevNode.isMeta &&
				!nextNode.isMeta &&
				prevNode.stackBottom.id === nextNode.stackBottom.id
			) {
				sample.node = prevNode;
			}
		});
	}
}
