import OpenAI from "openai";
import * as logger from "../logger/Logger";
import { GithubRepo } from "../model/GitHubRepo";
import { RagAgentAi } from "../model/RagAgentAi";
import type { Env } from "../types";

export async function scheduledHandler(
	event: ScheduledEvent,
	env: Env,
): Promise<boolean> {
	return true;
	// try {
	// 	const github = new GithubRepo(
	// 		"cloudflare",
	// 		"workers-sdk",
	// 		env.GITHUB_API_TOKEN,
	// 		logger,
	// 	);
	// 	const openAi = new OpenAI({
	// 		apiKey: env.OPENAI_API_KEY,
	// 	});
	// 	const ai = new RagAgentAi(env.AI, env.VECTORIZE_INDEX, logger, openAi);
	// 	const key = `${github.owner}-${github.repo}`;
	// 	const embeddingTrackerId = env.FILE_EMBEDDING_TRACKER.idFromName(key);
	// 	const embeddingTracker = env.FILE_EMBEDDING_TRACKER.get(embeddingTrackerId);
	// 	const currentCommit = await github.getCurrentCommitSha();
	// 	// Get the details from cache or use a default value
	// 	const detailsStr = await env.RAG_AGENT_KV.get("cloudflare/workers-sdk");
	// 	if (!detailsStr) {
	// 		logger.info("Details not found in KV store. Fetching all files.");
	// 		const allFilePaths = await github.getAllFilePaths();
	// 		logger.info(`${allFilePaths.length} files found.`);
	// 		const promises = [] as Promise<boolean>[];
	// 		await github.getManyFiles(allFilePaths, embedFiles(promises));
	// 		await Promise.all(promises);
	// 		await env.RAG_AGENT_KV.put(
	// 			"cloudflare/workers-sdk",
	// 			JSON.stringify({ latestCommit: currentCommit }),
	// 		);
	// 		return true;
	// 	}
	// 	const { latestCommit } = JSON.parse(detailsStr);
	// 	console.log("Latest commit: ", latestCommit);
	// 	if (latestCommit === currentCommit) {
	// 		console.log("No new commits");
	// 		return true;
	// 	}
	// 	const previousErroredFiles =
	// 		await embeddingTracker.getErroredFilenamesAsArray();
	// 	// Clear them all because if they error again, they will be re-added.
	// 	await embeddingTracker.clearErroredFiles();
	// 	const changes = await github.getFileChanges(latestCommit, currentCommit);
	// 	const filesToEmbed = [
	// 		...previousErroredFiles,
	// 		...changes.created,
	// 		...changes.modified,
	// 	];
	// 	const promises = [] as Promise<boolean>[];
	// 	await github.getManyFiles(filesToEmbed, embedFiles(promises));
	// 	await Promise.all(promises);
	// 	const filesToDelete = changes.deleted;
	// 	for (const file of filesToDelete) {
	// 		await ai.delete(file);
	// 	}
	// 	return true;
	// 	function embedFiles(promises: Promise<boolean>[]) {
	// 		return async function embed(files: { path: string; content: string }[]) {
	// 			logger.info(`Embedding ${files.length} files`);
	// 			return;
	// 			// for (const { path, content } of files) {
	// 			// 	// retry up to 5 times
	// 			// 	for (let i = 0; i < 5; i++) {
	// 			// 		// Create will upsert
	// 			// 		const createPromise = ai.create(path, content);
	// 			// 		promises.push(createPromise);
	// 			// 		const created = await createPromise;
	// 			// 		if (created) {
	// 			// 			logger.success(`Successfully embedded ${path}`);
	// 			// 			break;
	// 			// 		}
	// 			// 		logger.error(`Failed to embed ${path}. Retrying in 1 second...`);
	// 			// 		// sleep for 1 second before retrying
	// 			// 		await new Promise((resolve) => setTimeout(resolve, 1000));
	// 			// 	}
	// 			// 	// add to failed files in durable object
	// 			// 	logger.error(
	// 			// 		`Failed 5 times to embed ${path}. Adding to errored files.`,
	// 			// 	);
	// 			// 	await embeddingTracker.fileErrored(path, content);
	// 			// }
	// 		};
	// 	}
	// } catch (e) {
	// 	console.error(e);
	// 	return false;
	// }
}
