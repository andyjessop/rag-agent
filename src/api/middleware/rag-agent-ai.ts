import { RagAgentAi } from "../../model/RagAgentAi";
import type { Context, Next } from "../../types";

export async function ragAgentAi(c: Context, next: Next) {
	const logger = c.get("Logger");
	const openai = c.get("OpenAi");

	c.set(
		"RagAgentAi",
		new RagAgentAi(c.env.AI, c.env.VECTORIZE_INDEX, logger, openai),
	);

	await next();
}
