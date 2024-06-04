import type OpenAI from "openai";
import type { Logger } from "../logger/Logger";

export class RagAgentAi {
	private ai: Ai;
	private index: VectorizeIndex;
	private logger: Logger;
	private openai: OpenAI;

	constructor(ai: Ai, index: VectorizeIndex, logger: Logger, openAi: OpenAI) {
		this.ai = ai;
		this.index = index;
		this.logger = logger;
		this.openai = openAi;
	}

	async delete(path: string): Promise<number> {
		this.logger.info(`Deleting vector for ${path}.`);
		const hashedId = await create40CharHash(path);
		const { count } = await this.index.deleteByIds([hashedId]);
		this.logger.success(`Deleted ${count} vectors.`);

		return count;
	}

	async create(
		path: string,
		content: string,
		metadata?: Record<string, VectorizeVectorMetadataValue>,
	): Promise<boolean> {
		this.logger.info(`Creating vector for ${path}.`);

		if (metadata && !this.isValidMetadata(metadata)) {
			this.logger.error(
				`Invalid metadata for ${path}. Aborting vector creation.`,
			);
			return false;
		}

		this.logger.info(`Generating summary for ${path}.`);

		const summary = await this.generateSummary(path, content);

		if (!summary) {
			this.logger.error(
				`Failed to create summary for ${path}. Aborting vector creation.`,
			);
			return false;
		}

		this.logger.success(`Generated summary for ${path}.`);
		this.logger.info(`Generating vector for ${path}.`);

		const vector = await this.generateVector(summary);

		if (!vector) {
			this.logger.error(
				`Failed to create embeddings for ${path}. Aborting vector creation.`,
			);
			return false;
		}

		this.logger.success(`Generated vector for ${path}.`);
		this.logger.info(`Inserting vector for ${path}.`);

		const meta = {
			path,
			summary,
			...metadata,
		};

		const hashedId = await create40CharHash(path);

		await this.index.upsert([{ id: hashedId, values: vector, metadata: meta }]);

		this.logger.success(`Inserted vector for ${path}`);

		return true;
	}

	async addMetadata(
		path: string,
		metadata: Record<string, VectorizeVectorMetadataValue>,
	): Promise<boolean> {
		this.logger.info(`Adding metadata for ${path}.`);

		if (!this.isValidMetadata(metadata)) {
			this.logger.error(
				`Invalid metadata for ${path}. Aborting metadata addition.`,
			);
			return false;
		}

		const hashedId = await create40CharHash(path);

		const existing = await this.index.getByIds([hashedId]);

		if (!existing || !existing.length) {
			this.logger.error(
				`Vector for ${path} not found. Aborting metadata addition.`,
			);
			return false;
		}

		const vector = existing[0].values;
		const meta = {
			...existing[0].metadata,
			...metadata,
		};

		await this.index.upsert([{ id: hashedId, values: vector, metadata: meta }]);

		this.logger.success(`Added metadata for ${path}`);

		return true;
	}

	async similar(
		content: string,
		metadata?: Record<string, unknown>,
		numResults = 20,
	): Promise<VectorizeMatches["matches"]> {
		this.logger.info("Searching for similar content.");

		const queryVector = await this.generateVector(content);

		if (!queryVector) {
			this.logger.error("Failed to generate embeddings for query.");
			return [];
		}

		const filter = metadata
			? this.convertMetadataToFilter(metadata)
			: undefined;

		const results = await this.index.query(queryVector, {
			topK: numResults,
			...filter,
			returnValues: false,
			returnMetadata: true,
		});

		this.logger.info(`Found ${results.matches.length} matches.`);

		return results.matches;
	}

	private convertMetadataToFilter(metadata: Record<string, unknown> = {}): {
		filter: VectorizeVectorMetadataFilter;
	} {
		const filter: VectorizeVectorMetadataFilter = {};
		const keys = Object.keys(metadata);

		for (const key of keys) {
			const value = metadata[key];
			if (isMetadataFilterValue(value)) {
				filter[key] = value;
			} else {
				this.logger.warn(
					`Invalid metadata filter value for key ${key}: ${metadata[key]}`,
				);
			}
		}
		return { filter };
	}

	private async generateSummary(
		filename: string,
		content: string,
	): Promise<string | null> {
		try {
			this.logger.info(
				`Generating summary (content length: ${content.length} characters).`,
			);

			const prompt = buildPrompt(filename, content);

			let summary = null;

			try {
				this.logger.info(
					'Attempting to generate summary with model "@cf/meta/llama-3-8b-instruct".',
				);
				const aiResponse = (await this.ai.run("@cf/meta/llama-3-8b-instruct", {
					prompt,
				})) as {
					response?: string;
				};

				summary = aiResponse.response || null;
			} catch (e) {
				this.logger.warn(
					`Error generating summary with model "@cf/meta/llama-3-8b-instruct": ${JSON.stringify(
						e,
					)}`,
				);
			}

			if (!summary) {
				try {
					this.logger.info(
						'Attempting to generate summary with model "gpt-3.5-turbo-0125".',
					);
					const aiResponse = await this.openai.chat.completions.create({
						model: "gpt-3.5-turbo-0125",
						messages: [
							{
								role: "system",
								content: "You are an AI assistant.",
							},
							{
								role: "user",
								content: prompt,
							},
						],
					});

					summary = aiResponse.choices?.[0].message.content || null;
				} catch (e) {
					this.logger.warn(
						`Error generating summary with model "gpt-3.5-turbo-0125": ${JSON.stringify(
							e,
						)}`,
					);
				}
			}

			if (!summary) {
				try {
					// try to generate summary with sliced content
					const slicedContent = content.slice(0, 100_000);
					const slicedPrompt = buildPrompt(filename, slicedContent);
					this.logger.info(
						'Attempting to generate summary with model "gpt-4o" and sliced content (100,000 characters).',
					);
					const aiResponse = await this.openai.chat.completions.create({
						model: "gpt-4o",
						messages: [
							{
								role: "system",
								content: "You are an AI assistant.",
							},
							{
								role: "user",
								content: slicedPrompt,
							},
						],
					});

					summary = aiResponse.choices?.[0].message.content || null;
				} catch (e) {
					this.logger.warn(
						`Error generating summary with model "gpt-4o": ${JSON.stringify(
							e,
						)}`,
					);
				}
			}

			if (summary) {
				this.logger.success("Generated summary successfully.");
			} else {
				this.logger.error("Failed to generate summary.");
			}

			return summary;
		} catch (e) {
			this.logger.error(`Error generating summary: ${JSON.stringify(e)}`);
			return null;
		}
	}

	private async generateVector(text: string): Promise<number[] | null> {
		try {
			this.logger.info("Generating vector.");

			const embedding = await this.openai.embeddings.create({
				encoding_format: "float",
				input: text,
				model: "text-embedding-3-small",
			});

			const vector = embedding?.data?.[0].embedding;

			if (!vector?.length) {
				this.logger.error("Error generating vector.");
				return null;
			}

			this.logger.success("Generated vector successfully.");

			return vector;
		} catch (e) {
			this.logger.error("Error generating vector.");
			return null;
		}
	}

	private isValidMetadata(
		metadata: Record<string, unknown>,
	): metadata is Record<string, VectorizeVectorMetadataValue> {
		const keys = Object.keys(metadata);

		for (const key of keys) {
			const value = metadata[key];

			if (!isMetadataFilterValue(value)) {
				this.logger.warn(
					`Invalid metadata value for key ${key}: ${metadata[key]}`,
				);
				return false;
			}
		}

		return true;
	}
}

function isMetadataFilterValue(
	value: unknown,
): value is VectorizeVectorMetadataFilter[keyof VectorizeVectorMetadataFilter] {
	return (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null ||
		value === undefined
	);
}

function buildPrompt(filename: string, content: string) {
	return `
  ## Prompt for Generating File Summaries

  ### Context:
  
  You are an AI assistant tasked with generating a detailed summary for a single file in a software repository. This summary will be embedded and used to retrieve relevant files based on user queries. The summary should be comprehensive enough to allow a skilled developer to understand the purpose and functionality of the file, and potentially implement its contents.
  
  ### Instructions:
  
  1. **File Type Identification:**
     - Identify the type of file (e.g., source code, configuration, documentation, etc.).
     - Specify the programming language or format (e.g., TypeScript, Go, JSON, Markdown).
  
  2. **Purpose and Role:**
     - Explain why the file exists in the repository.
     - Describe its role within the project.
  
  3. **Detailed Description:**
     - For code files, provide a detailed explanation of the module, class, or function(s) contained within the file.
     - Describe the main logic, algorithms, or data structures used.
     - Highlight any important dependencies or integrations with other parts of the project.
  
  4. **Usage and Implementation:**
     - Provide a high-level overview of how a developer might use or implement the contents of the file.
     - Include any relevant usage examples or scenarios.
  
  5. **Additional Context:**
     - Mention any relevant comments or documentation within the file that provide further context.
     - Note any specific configurations, environment variables, or external resources required.
  
  ### Summary Format:
  
  - **File Type:** [Type of file]
  - **Programming Language/Format:** [Language/Format]
  - **Purpose and Role:** [Detailed explanation of why the file is in the repo and its role]
  - **Detailed Description:**
    - [Detailed explanation of the module, class, or function(s)]
    - [Main logic, algorithms, or data structures]
    - [Dependencies or integrations]
  - **Usage and Implementation:**
    - [High-level overview of usage or implementation]
    - [Usage examples or scenarios]
  - **Additional Context:**
    - [Relevant comments or documentation]
    - [Specific configurations, environment variables, or external resources]

  ### Example Summary:
  
  **File Type:** Source Code  
  **Programming Language/Format:** TypeScript  
  **Purpose and Role:** This file defines the main service responsible for handling user authentication within the application. It includes functions for login, logout, and session management.  
  **Detailed Description:**
  - **Module:** \`AuthService\`
    - **Functions:** \`login\`, \`logout\`, \`getSession\`
    - **Main Logic:** The \`login\` function validates user credentials against the database, creates a session token, and stores it in the session store. The \`logout\` function invalidates the session token. The \`getSession\` function retrieves the current session details.
    - **Dependencies:** Utilizes the \`bcrypt\` library for password hashing and \`jsonwebtoken\` for token generation.
  - **Usage and Implementation:**
    - **Overview:** A developer can use the \`AuthService\` to manage user authentication by calling the \`login\` and \`logout\` functions as needed.
    - **Example:** 
      \`\`\`typescript
      const authService = new AuthService();
      authService.login(username, password);
      \`\`\`
  - **Additional Context:**
    - **Comments:** Inline comments provide details on the token generation process.
    - **Configurations:** Requires environment variables \`JWT_SECRET\` and \`SESSION_STORE_URL\`.
  
  ### File Information:
  
  - **Filename:** ${filename}
  - **Content:** ${content}
  
  By following these instructions, you should be able to generate a detailed and informative summary for the provided file. It is important to ensure that summary is concise, not longer than 1500 words.
  `;
}

export async function create40CharHash(message: string) {
	const msgUint8 = new TextEncoder().encode(message); // encode as (utf-8) Uint8Array
	const hashBuffer = await crypto.subtle.digest("SHA-1", msgUint8); // hash the message
	const hashArray = Array.from(new Uint8Array(hashBuffer)); // convert buffer to byte array
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join(""); // convert bytes to hex string
	return hashHex;
}
