import { Hono } from "hono";
import type { Env, Variables } from "../types";
import { auth } from "./middleware/auth";
import { openAi } from "./middleware/openai";
import { logger } from "./middleware/logger";
import { ragAgentAi } from "./middleware/rag-agent-ai";
import { keys } from "./middleware/keys";

export const api = new Hono<{ Bindings: Env; Variables: Variables }>();

api.use(logger);
api.use(keys);
api.use(auth);
api.use(openAi);
api.use(ragAgentAi);

api.post("/:owner/:repo/similar", async (c) => {
	const body = (await c.req.json()) as { content: string; type: string };
	const vectors = c.get("RagAgentAi");
	const matches = await vectors.similar(
		body.content,
		body.type ? { type: body.type } : undefined,
	);

	return c.json({
		data: matches,
	});
});

api.get("/:owner/:repo/latest_commit", async (c) => {
	const owner = c.req.param("owner");
	const repo = c.req.param("repo");
	const key = `${owner}-${repo}`;
	const embeddingTrackerId = c.env.FILE_EMBEDDING_TRACKER.idFromName(key);
	const embeddingTracker = c.env.FILE_EMBEDDING_TRACKER.get(embeddingTrackerId);

	const latestCommit = await embeddingTracker.getLatestCommit();

	return c.json({
		data: latestCommit,
	});
});

api.post("/:owner/:repo/latest_commit", async (c) => {
	const owner = c.req.param("owner");
	const repo = c.req.param("repo");
	const body = (await c.req.json()) as { sha: string };

	const key = `${owner}-${repo}`;
	const embeddingTrackerId = c.env.FILE_EMBEDDING_TRACKER.idFromName(key);
	const embeddingTracker = c.env.FILE_EMBEDDING_TRACKER.get(embeddingTrackerId);

	const newCommit = await embeddingTracker.setLatestCommit(body.sha);

	return c.json({
		data: newCommit,
	});
});

api.post("/:owner/:repo/file", async (c) => {
	const body = (await c.req.json()) as { path: string; content: string };

	const ai = c.get("RagAgentAi");
	const result = await ai.create(body.path, body.content, { type: "file" });

	if (!result) {
		return c.json(
			{
				error: "Failed to embed file",
			},
			500,
		);
	}

	return c.json({
		data: { created: result },
	});
});

api.delete("/:owner/:repo/file", async (c) => {
	const body = (await c.req.json()) as { path: string };

	const ai = c.get("RagAgentAi");
	const count = await ai.delete(body.path);

	return c.json({
		data: { deleted: count === 1 },
	});
});
