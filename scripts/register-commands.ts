import { register } from "discord-hono";
import { spotCommand } from "../main.ts";

register(
	[spotCommand],
	process.env.DISCORD_APPLICATION_ID,
	process.env.DISCORD_BOT_TOKEN,
	process.env.DISCORD_GUILD_ID,
);
