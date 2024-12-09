export type TraceEvent = Record<string, any> & {
	id?: string;
	pid: number;
	name: string;
	ph: string;
	ts: number;
	dur?: number;
	args: any;
};
