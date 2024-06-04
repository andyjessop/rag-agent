import { scheduledHandler } from "./scheduled/handler";
import { api } from "./api";
export { FileEmbeddingTracker } from "./model/FileEmbeddingTracker";

export default {
	fetch: api.fetch,
	scheduled: scheduledHandler,
};
