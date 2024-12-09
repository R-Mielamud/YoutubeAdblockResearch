import ProtocolMapping from "devtools-protocol/types/protocol-mapping";

export type CommandParams<TCommand extends keyof ProtocolMapping.Commands> =
	ProtocolMapping.Commands[TCommand]["paramsType"][0];
