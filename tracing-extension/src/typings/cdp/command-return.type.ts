import ProtocolMapping from "devtools-protocol/types/protocol-mapping";

export type CommandReturn<TCommand extends keyof ProtocolMapping.Commands> =
	ProtocolMapping.Commands[TCommand]["returnType"];
