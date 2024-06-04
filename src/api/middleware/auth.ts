import type { Context, Next } from "../../types";

export async function auth(c: Context, next: Next) {
	const apiKey = c.get("RAG_AGENT_API_KEY");

	const isAuthorized = c.req.header("rag-agent-api-key") === apiKey;

	console.log(apiKey, c.req.header("rag-agent-api-key"), isAuthorized);

	if (!isAuthorized) {
		return c.json({ error: "Unauthorized" }, 401);
	}

	await next();
}
