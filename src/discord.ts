import { verifyKey } from "discord-interactions";
import { z } from "zod";
import type { Env } from "../main.ts";
import { getEnv } from "./env.ts";

// Discord側の発行した署名を検証
export async function verifyDiscordSignature(
	req: Request,
	env: Env,
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
	env: Env,
): Promise<boolean> {
	const guildId = getEnv(env, "DISCORD_GUILD_ID");
	const token = getEnv(env, "DISCORD_BOT_TOKEN");

	const response = await fetch(
		`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`,
		{ headers: { Authorization: `Bot ${token}` } },
	);

	if (!response.ok) return false;

	const memberSchema = z.object({ joined_at: z.string() });
	const member = memberSchema.safeParse(await response.json());
	if (!member.success) return false;
	const joinedAt = new Date(member.data.joined_at).getTime();
	const daysSinceJoin = (Date.now() - joinedAt) / (1000 * 60 * 60 * 24);

	// オープンサーバー参加から3日経過していることを確認する(スパム防止)
	return daysSinceJoin >= 3;
}
