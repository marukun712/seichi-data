// https://discord.js.org/docs/packages/discord.js/main/REST:Class
// https://discord.js.org/docs/packages/discord.js/main/SlashCommandBuilder:Class
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import seriesJson from "../public/series.json" with { type: "json" };

function getEnv(name: string): string {
	const value = Deno.env.get(name);
	if (!value) throw new Error(`${name} is not set`);
	return value;
}

const command = new SlashCommandBuilder()
	.setName("spot")
	.setDescription("聖地を投稿します")
	.addStringOption((option) =>
		option
			.setName("series")
			.setDescription("シリーズ")
			.setRequired(true)
			.addChoices(
				...seriesJson.series.map((s: { id: string; name: string }) => ({
					name: s.name,
					value: s.id,
				})),
			),
	)
	.addStringOption((option) =>
		option.setName("title").setDescription("施設名").setRequired(true),
	)
	.addStringOption((option) =>
		option.setName("description").setDescription("説明").setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName("maps_url")
			.setDescription("Google Maps URL")
			.setRequired(true),
	)
	.addStringOption((option) =>
		option.setName("episode").setDescription("エピソード").setRequired(false),
	)
	.addAttachmentOption((option) =>
		option.setName("image").setDescription("画像").setRequired(false),
	);

const rest = new REST().setToken(getEnv("DISCORD_BOT_TOKEN"));

await rest.put(
	Routes.applicationGuildCommands(
		getEnv("DISCORD_APPLICATION_ID"),
		getEnv("DISCORD_GUILD_ID"),
	),
	{ body: [command.toJSON()] },
);

console.log("コマンドを登録しました");
