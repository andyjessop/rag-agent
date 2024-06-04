import OpenAI from "openai";
import type { Context, Next } from "../../types";

export async function openAi(c: Context, next: Next) {
	const OPENAI_API_KEY = c.get("OPENAI_API_KEY");
	const logger = c.get("Logger");

	if (!OPENAI_API_KEY) {
		logger.error("No OpenAI API key provided.");
		return c.json({ error: "Unauthorized" }, 401);
	}

	c.set(
		"OpenAi",
		new OpenAI({
			apiKey: OPENAI_API_KEY,
		}),
	);

	await next();
}
