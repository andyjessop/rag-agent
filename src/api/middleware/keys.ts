import type { Context, Next } from "../../types";

export async function keys(c: Context, next: Next) {
	const openAiKey = c.req.header("openai-api-key") as string;
	const ragAgentAiKey = c.req.header("rag-agent-api-key") as string;
	const logger = c.get("Logger");

	if (!openAiKey) {
		logger.info("No OpenAI API key provided.");
	}

	if (!ragAgentAiKey) {
		logger.info("No RAG Agent API key provided.");
	}

	c.set("OPENAI_API_KEY", openAiKey);
	c.set("RAG_AGENT_API_KEY", ragAgentAiKey);

	await next();
}
