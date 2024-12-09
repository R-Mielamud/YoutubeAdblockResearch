import ProtocolMapping from "devtools-protocol/types/protocol-mapping";
import {
	CommandParams,
	CommandReturn,
	EventParams,
	ParameterlessCommands,
} from "src/typings";

export interface ICDPSession {
	isAttached: boolean;

	attach(): Promise<void>;

	detach(): Promise<void>;

	addListener<TEvent extends keyof ProtocolMapping.Events>(
		method: TEvent,
		listener: (params: EventParams<TEvent>) => Promise<void> | void
	): () => void;

	removeAllListeners(): void;

	sendCommand<TCommand extends keyof ParameterlessCommands>(
		method: TCommand
	): Promise<CommandReturn<TCommand>>;
	sendCommand<TCommand extends keyof ProtocolMapping.Commands>(
		method: TCommand,
		params: CommandParams<TCommand>
	): Promise<CommandReturn<TCommand>>;
}
