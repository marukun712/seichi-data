import { z } from "zod";
import type { Bindings } from "./env.ts";

export async function checkMemberAge(
	userId: string,
	env: Bindings,
): Promise<boolean> {
	const guildId = env.DISCORD_GUILD_ID;
	const token = env.DISCORD_TOKEN;

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
