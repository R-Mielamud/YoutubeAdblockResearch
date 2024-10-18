declare namespace CDP {
	export namespace Runtime {
		export type ScriptId = string;
		export type UnserializableValue = string;

		export type RemoteObject = {
			type:
				| "object"
				| "function"
				| "undefined"
				| "string"
				| "number"
				| "boolean"
				| "symbol"
				| "bigint";
			subtype?:
				| "array"
				| "null"
				| "node"
				| "regexp"
				| "date"
				| "map"
				| "set"
				| "weakmap"
				| "weakset"
				| "iterator"
				| "generator"
				| "error"
				| "proxy"
				| "promise"
				| "typedarray"
				| "arraybuffer"
				| "dataview"
				| "webassemblymemory"
				| "wasmvalue";
			className?: string;
			value?: any;
			unserializableValue?: UnserializableValue;
			description?: string;
		};

		export type StackTrace = {
			description?: string;
			callFrames: Debugger.CallFrame[];
			parent?: StackTrace;
		};
	}

	export namespace Debugger {
		export type BreakpointId = string;
		export type CallFrameId = string;

		export type Location = {
			scriptId: Runtime.ScriptId;
			lineNumber: number;
			columnNumber: number;
		};

		export type Scope = {
			type:
				| "global"
				| "local"
				| "with"
				| "closure"
				| "catch"
				| "block"
				| "script"
				| "eval"
				| "module"
				| "wasm-expression-stack";
			object: Runtime.RemoteObject;
			name?: string;
			startLocation?: Location;
			endLocation?: Location;
		};

		export type CallFrame = {
			callFrameId: CallFrameId;
			functionName: string;
			functionLocation?: Location;
			location: Location;
			url: string;
			scopeChain: Scope[];
			this: Runtime.RemoteObject;
			returnValue?: Runtime.RemoteObject;
		};

		export namespace Enable {
			export const method = "Debugger.enable" as const;
			export type Params = void;
			export type Return = void;
		}

		export namespace Paused {
			export const method = "Debugger.paused" as const;

			export type Params = {
				callFrames: CallFrame[];
				reason:
					| "ambiguous"
					| "assert"
					| "CSPViolation"
					| "debugCommand"
					| "DOM"
					| "EventListener"
					| "exception"
					| "instrumentation"
					| "OOM"
					| "other"
					| "promiseRejection"
					| "XHR"
					| "step";
				data?: object;
				hitBreakpoints?: BreakpointId[];
				asyncStackTrace?: Runtime.StackTrace;
			};

			export type Return = void;
		}

		export namespace SetBreakpoint {
			export const method = "Debugger.setBreakpoint" as const;

			export type Params = {
				location: Location;
				condition: string;
			};

			export type Return = {
				breakpointId: BreakpointId;
				actualLocation: Location;
			};
		}

		export namespace SetBreakpointByURL {
			export const method = "Debugger.setBreakpointByUrl" as const;

			export type Params = {
				lineNumber: number;
				columnNumber?: number;
				scriptHash?: string;
				condition?: string;
			} & ({ url: string } | { urlRegex: string });

			export type Return = {
				breakpointId: BreakpointId;
				locations: Location[];
			};
		}

		export namespace StepInto {
			export const method = "Debugger.stepInto" as const;
			export type Params = void;
			export type Return = void;
		}
	}

	export namespace DOMDebugger {
		export namespace SetXHRBreakpoint {
			export const method = "DOMDebugger.setXHRBreakpoint" as const;

			export type Params = {
				url: string;
			};

			export type Return = void;
		}
	}

	export type AnyMethod =
		| typeof Debugger.Enable.method
		| typeof Debugger.Paused.method
		| typeof Debugger.SetBreakpoint.method
		| typeof Debugger.SetBreakpointByURL.method
		| typeof Debugger.StepInto.method
		| typeof DOMDebugger.SetXHRBreakpoint.method;

	export type ParameterlessMethod =
		| typeof Debugger.Enable.method
		| typeof Debugger.StepInto.method;

	export type MethodParams<TMethod extends AnyMethod> =
		TMethod extends typeof Debugger.Enable.method
			? Debugger.Enable.Params
			: TMethod extends typeof Debugger.Paused.method
			? Debugger.Paused.Params
			: TMethod extends typeof Debugger.SetBreakpoint.method
			? Debugger.SetBreakpoint.Params
			: TMethod extends typeof Debugger.SetBreakpointByURL.method
			? Debugger.SetBreakpointByURL.Params
			: TMethod extends typeof Debugger.StepInto.method
			? Debugger.StepInto.Params
			: TMethod extends typeof DOMDebugger.SetXHRBreakpoint.method
			? DOMDebugger.SetXHRBreakpoint.Params
			: never;

	export type MethodReturn<TMethod extends AnyMethod> =
		TMethod extends typeof Debugger.Enable.method
			? Debugger.Enable.Return
			: TMethod extends typeof Debugger.Paused.method
			? Debugger.Paused.Return
			: TMethod extends typeof Debugger.SetBreakpoint.method
			? Debugger.SetBreakpoint.Return
			: TMethod extends typeof Debugger.SetBreakpointByURL.method
			? Debugger.SetBreakpointByURL.Return
			: TMethod extends typeof Debugger.StepInto.method
			? Debugger.StepInto.Return
			: TMethod extends typeof DOMDebugger.SetXHRBreakpoint.method
			? DOMDebugger.SetXHRBreakpoint.Return
			: never;
}
