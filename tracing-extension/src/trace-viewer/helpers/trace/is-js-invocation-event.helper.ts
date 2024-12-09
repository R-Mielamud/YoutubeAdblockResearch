import { TraceEvent } from "src/typings";

export const isJSInvocationEvent = ({ name }: TraceEvent): boolean => {
	return (
		[
			"RunMicrotasks",
			"FunctionCall",
			"EvaluateScript",
			"EventDispatch",
		].includes(name) || name.toLowerCase().startsWith("v8.")
	);
};
