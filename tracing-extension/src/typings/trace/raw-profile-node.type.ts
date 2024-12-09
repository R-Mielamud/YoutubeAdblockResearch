export type RawProfileNode = {
	id: number;
	parent?: number;
	callFrame: {
		functionName: string;
		url?: string;
		scriptId: number | string;
		lineNumber?: number;
		columnNumber?: number;
	};
};
