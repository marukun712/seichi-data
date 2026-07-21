// https://github.com/discord/discord-interactions-js
import { verifyKey } from "discord-interactions";
import { getEnv } from "./env.ts";

export async function verifyDiscordSignature(
	req: Request,
	env: Record<string, string>,
): Promise<{ valid: boolean; body: string }> {
	const signature = req.headers.get("X-Signature-Ed25519") ?? "";
	const timestamp = req.headers.get("X-Signature-Timestamp") ?? "";
	const body = await req.text();

	const valid = await verifyKey(
		body,
		signature,
		timestamp,
		getEnv(env, "DISCORD_PUBLIC_KEY"),
	);
	return { valid, body };
}

export async function checkMemberAge(
	userId: string,
	env: Record<string, string>,
): Promise<boolean> {
	const guildId = getEnv(env, "DISCORD_GUILD_ID");
	const token = getEnv(env, "DISCORD_BOT_TOKEN");

	const response = await fetch(
		`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
		{ headers: { Authorization: `Bot ${token}` } },
	);

	if (!response.ok) return false;

	const member = await response.json();
	if (!member?.joined_at) return false;
	const joinedAt = new Date(member.joined_at).getTime();
	const daysSinceJoin = (Date.now() - joinedAt) / (1000 * 60 * 60 * 24);

	return daysSinceJoin >= 3;
}
