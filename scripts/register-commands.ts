import process from "node:process";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
import seriesJson from "../public/series.json" with { type: "json" };

function getEnv(name: string): string {
	const value = process.env[name];
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
		option
			.setName("title")
			.setDescription("場所の名前を入力")
			.setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName("pluscode")
			.setDescription("場所コードを入力")
			.setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName("description")
			.setDescription("場所の説明を入力")
			.setRequired(false),
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
