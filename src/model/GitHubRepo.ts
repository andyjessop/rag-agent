import type { Logger } from "../logger/Logger";

type FileChanges = {
	created: string[];
	deleted: string[];
	modified: string[];
};

type GithubFile = {
	filename: string; // "test.txt"
	status: string; // "added"
};

type GithubCompareResponse = {
	files: GithubFile[];
};

type GithubBranch = {
	name: string;
	commit: {
		sha: string;
	};
};

type GithubBranchResponse = GithubBranch;

type GithubTreeResponse = {
	tree: [
		{
			path: string;
			type: string;
		},
	];
};

type GithubContentResponse = {
	content: string;
};

export class GithubRepo {
	mainBranch: string;
	logger: Logger;
	owner: string;
	repo: string;
	githubToken: string;

	constructor(
		owner: string,
		repo: string,
		githubToken: string,
		logger: Logger,
		mainBranch = "main",
	) {
		this.mainBranch = mainBranch;
		this.logger = logger;
		this.owner = owner;
		this.repo = repo;
		this.githubToken = githubToken;
	}

	async getCurrentCommitSha(): Promise<string> {
		const main = await this.makeRequest<GithubBranchResponse>(
			`https://api.github.com/repos/${this.owner}/${this.repo}/branches/${this.mainBranch}`,
		);

		if (!main) {
			this.logger.error("Error fetching main branch");
			return "";
		}

		return main.commit.sha;
	}

	async getAllFilePaths(): Promise<string[]> {
		const data = await this.makeRequest<GithubTreeResponse>(
			`https://api.github.com/repos/${this.owner}/${this.repo}/git/trees/main?recursive=1`,
		);

		if (!data) {
			return [];
		}

		return data?.tree
			.filter((file) => file.type === "blob")
			.map((file) => file.path);
	}

	async getFileChanges(base: string, head: string): Promise<FileChanges> {
		const data = await this.makeRequest<GithubCompareResponse>(
			`https://api.github.com/repos/${this.owner}/${this.repo}/compare/${base}...${head}`,
		);

		const fileChanges: FileChanges = {
			created: [],
			deleted: [],
			modified: [],
		};

		if (!data) {
			this.logger.error("Error fetching file changes");

			return fileChanges;
		}

		const files = data.files;

		for (const file of files) {
			if (file.status === "added") {
				fileChanges.created.push(file.filename);
			} else if (file.status === "removed") {
				fileChanges.deleted.push(file.filename);
			} else if (file.status === "modified") {
				fileChanges.modified.push(file.filename);
			}
		}

		return fileChanges;
	}

	async getFileContent(filePath: string): Promise<string | null> {
		const file = await this.makeRequest<GithubContentResponse>(
			`https://api.github.com/repos/${this.owner}/${this.repo}/contents/${filePath}`,
		);

		if (!file) {
			return null;
		}

		return atob(file.content);
	}

	async getManyFiles(
		filePaths: string[],
		batchCallback: (
			contentBatch: Array<{ path: string; content: string }>,
		) => void,
	): Promise<Array<{ path: string; content: string }>> {
		const results = [] as Array<{ path: string; content: string }>;
		const rateLimit = 10; // Adjust based on your rate limit handling strategy
		for (let i = 0; i < filePaths.length; i += rateLimit) {
			const batch = filePaths.slice(i, i + rateLimit);
			const batchResults = await Promise.all(
				batch.map(async (path) => {
					const content = await this.getFileContent.bind(this)(path);
					if (!content) {
						return null;
					}

					return {
						path,
						content,
					};
				}),
			);

			batchCallback(
				batchResults.filter((r) => r !== null) as Array<{
					path: string;
					content: string;
				}>,
			);

			await new Promise((resolve) => setTimeout(resolve, 5000)); // 5 second delay
		}
		return results;
	}

	private async makeRequest<T>(url: string): Promise<T | undefined> {
		try {
			console.log(`Making request to ${url}`);
			const response = await fetch(url, {
				headers: {
					Accept: "application/vnd.github.v3+json",
					"X-GitHub-Api-Version": "2022-11-28",
					Authorization: `token ${this.githubToken}`,
					"User-Agent": "rag-agent",
				},
			});

			if (response.headers.get("x-ratelimit-remaining") === "0") {
				this.logger.warn("GitHub rate limited.");

				const limit = response.headers.get("x-ratelimit-limit");

				if (limit) {
					this.logger.warn(`Hourly rate limit: ${limit}`);
				}

				const used = response.headers.get("x-ratelimit-used");

				if (used) {
					this.logger.warn(`Requests used in current window: ${used}`);
				}

				const reset = response.headers.get("x-ratelimit-reset");

				if (reset) {
					this.logger.warn(
						`Window resets at: ${reset} (${new Date(
							Number.parseInt(reset, 10) * 1000,
						)})`,
					);
				}
			}

			if (!response.ok) {
				throw new Error(`Error fetching commit: ${response.statusText}`);
			}

			const data = await response.json();

			return data as T;
		} catch (e) {
			this.logger.error("Error making request.");
		}
	}
}
