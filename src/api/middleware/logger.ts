import * as Logger from "../../logger/Logger";
import type { Context, Next } from "../../types";

export async function logger(c: Context, next: Next) {
	c.set("Logger", Logger);

	await next();
}
