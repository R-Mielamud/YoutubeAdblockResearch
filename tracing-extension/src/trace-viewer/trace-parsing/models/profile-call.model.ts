import { ProfileNode } from "./profile-node.model";

export class ProfileCall {
	public node: ProfileNode;
	public parent?: ProfileCall;
	public startTime: number;
	public endTime: number;
	public depth: number;

	public constructor({
		node,
		parent,
		startTime,
		endTime = -1,
		depth,
	}: {
		node: ProfileNode;
		parent?: ProfileCall;
		startTime: number;
		endTime?: number;
		depth?: number;
	}) {
		this.node = node;
		this.parent = parent;
		this.startTime = startTime;
		this.endTime = endTime;
		this.depth = depth ?? node.depth;
	}

	public static copy(call: ProfileCall, parent?: ProfileCall) {
		return new ProfileCall({
			node: call.node,
			parent,
			startTime: call.startTime,
			endTime: call.endTime,
			depth: (parent?.depth ?? -1) + 1,
		});
	}

	public get stack(): ProfileCall[] {
		const reverseAncestors: ProfileCall[] = [];
		let current: ProfileCall | undefined = this;

		while (current) {
			reverseAncestors.push(current);
			current = current.parent;
		}

		return reverseAncestors.reverse();
	}
}
