import type {
	Hono,
	Context as HonoContext,
	MiddlewareHandler as HonoMiddlewareHandler,
} from "hono";
import type OpenAI from "openai";
import type { Logger } from "./logger/Logger";
import type { RagAgentAi } from "./model/RagAgentAi";
import type { FileEmbeddingTracker } from "./model/FileEmbeddingTracker";

export type Env = {
	// biome-ignore lint/suspicious/noExplicitAny: disable
	AI: any;
	FILE_EMBEDDING_TRACKER: DurableObjectNamespace<FileEmbeddingTracker>;
	GITHUB_API_TOKEN: string;
	OPENAI_API_KEY: string;
	RAG_AGENT_KV: KVNamespace;
	VECTORIZE_INDEX: VectorizeIndex;
};

export type Variables = {
	Logger: Logger;
	OpenAi: OpenAI;
	RAG_AGENT_API_KEY: string;
	OPENAI_API_KEY: string;
	RagAgentAi: RagAgentAi;
};

export type App = Hono<{ Bindings: Env; Variables: Variables }>;

export type MiddlewareHandler = HonoMiddlewareHandler<{
	Bindings: Env;
	Variables: Variables;
}>;
export type Context = HonoContext<{ Bindings: Env; Variables: Variables }>;
export type Next = () => Promise<void>;
