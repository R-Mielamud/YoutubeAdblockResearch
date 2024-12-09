import ProtocolMapping from "devtools-protocol/types/protocol-mapping";

export type EventParams<TEvent extends keyof ProtocolMapping.Events> =
	ProtocolMapping.Events[TEvent][0];
