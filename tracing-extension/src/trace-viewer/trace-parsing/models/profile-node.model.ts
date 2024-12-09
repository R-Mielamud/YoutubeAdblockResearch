import { RawProfileNode } from "src/typings";

export class ProfileNode {
	public id: number;
	public parentId?: number;
	public parent?: ProfileNode;
	public depth: number = -1;
	public children: ProfileNode[] = [];
	public functionName: string;
	public url: string;
	public scriptId: string;
	public lineNumber: number;
	public columnNumber: number;

	public constructor(rawNode: RawProfileNode) {
		this.id = rawNode.id;
		this.parentId = rawNode.parent;
		this.functionName = rawNode.callFrame.functionName || "(anonymous)";
		this.url = rawNode.callFrame.url ?? "";
		this.scriptId = String(rawNode.callFrame.scriptId);
		this.lineNumber = (rawNode.callFrame.lineNumber ?? -1) + 1;
		this.columnNumber = (rawNode.callFrame.columnNumber ?? -1) + 1;
	}

	public get signature(): string {
		return `${this.functionName}@${this.url}:${this.lineNumber}:${this.columnNumber}`;
	}

	public get isInText(): boolean {
		return this.lineNumber > 0 && this.columnNumber > 0;
	}

	public get isRoot(): boolean {
		return !this.isInText && !this.parent && this.functionName === "(root)";
	}

	public get isTopLevel(): boolean {
		return this.parent?.isRoot ?? false;
	}

	public get isIdle(): boolean {
		return (
			!this.isInText && this.isTopLevel && this.functionName === "(idle)"
		);
	}

	public get isProgram(): boolean {
		return (
			!this.isInText &&
			this.isTopLevel &&
			this.functionName === "(program)"
		);
	}

	public get isGarbageCollector(): boolean {
		return (
			!this.isInText &&
			this.isTopLevel &&
			this.functionName === "(garbage collector)"
		);
	}

	public get isMeta(): boolean {
		return (
			this.isRoot ||
			this.isIdle ||
			this.isProgram ||
			this.isGarbageCollector
		);
	}

	public get stackBottom(): ProfileNode {
		let current: ProfileNode = this;

		while (current.parent?.parent) {
			current = current.parent;
		}

		return current;
	}

	public get stack(): ProfileNode[] {
		const reverseAncestors: ProfileNode[] = [];
		let current: ProfileNode | undefined = this;

		while (current) {
			reverseAncestors.push(current);
			current = current.parent;
		}

		return reverseAncestors.reverse();
	}

	public isSameFunction(other: ProfileNode): boolean {
		const makeValuesToCompare = (node: ProfileNode) => [
			node.functionName,
			node.url,
			node.scriptId,
			node.lineNumber,
			node.columnNumber,
		];

		const thisValues = makeValuesToCompare(this);
		const otherValues = makeValuesToCompare(other);

		return thisValues.every((value, index) => value === otherValues[index]);
	}
}
