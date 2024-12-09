import ProtocolMapping from "devtools-protocol/types/protocol-mapping";

export type ParameterlessCommands = {
	[TKey in keyof ProtocolMapping.Commands as ProtocolMapping.Commands[TKey]["paramsType"] extends []
		? TKey
		: ProtocolMapping.Commands[TKey]["paramsType"][0] extends {} | undefined
		? TKey
		: never]: ProtocolMapping.Commands[TKey];
};
