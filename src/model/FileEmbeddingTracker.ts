import { DurableObject } from "cloudflare:workers";

export class FileEmbeddingTracker extends DurableObject {
	latestCommit: string | null;
	erroredFiles: Map<string, string>;

	constructor(state: DurableObjectState, env: Env) {
		super(state, env);
		this.erroredFiles = new Map<string, string>();
		this.latestCommit = null;
	}

	async clearErroredFiles(): Promise<void> {
		this.erroredFiles.clear();
	}

	async fileErrored(filename: string, content: string): Promise<void> {
		this.erroredFiles.set(filename, content);
	}

	async getErroredFilenamesAsArray(): Promise<string[]> {
		return Array.from(this.erroredFiles.keys());
	}

	async setLatestCommit(commit: string): Promise<void> {
		this.latestCommit = commit;
	}

	async getLatestCommit(): Promise<string | null> {
		return this.latestCommit;
	}
}
