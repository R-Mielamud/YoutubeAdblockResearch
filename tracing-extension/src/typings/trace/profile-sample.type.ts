import { ProfileNode } from "src/trace-viewer/trace-parsing";

export type ProfileSample = {
	timestamp: number;
	node: ProfileNode;
};
