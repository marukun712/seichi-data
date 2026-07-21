// https://discord.js.org/docs/packages/discord.js/main
import type {
	APIApplicationCommandInteractionDataAttachmentOption,
	APIApplicationCommandInteractionDataStringOption,
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
} from "discord.js";
import {
	ApplicationCommandOptionType,
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
} from "discord.js";
import seriesJson from "./public/series.json";
import { checkMemberAge, verifyDiscordSignature } from "./src/discord.ts";
import { createSpotPR } from "./src/github.ts";
import { processImage } from "./src/image.ts";
import { parseGoogleMapsUrl } from "./src/maps.ts";
import { spotInputSchema } from "./src/schema.ts";

const SERIES_NAMES: Record<string, string> = Object.fromEntries(
	seriesJson.series.map((s: { id: string; name: string }) => [s.id, s.name]),
);

export interface Env {
	DISCORD_PUBLIC_KEY: string;
	DISCORD_BOT_TOKEN: string;
	DISCORD_GUILD_ID: string;
	DISCORD_APPLICATION_ID: string;
	GITHUB_APP_ID: string;
	GITHUB_APP_PRIVATE_KEY: string;
	GITHUB_INSTALLATION_ID: string;
	GITHUB_REPO_OWNER: string;
	GITHUB_REPO_NAME: string;
}

function isChatInputCommand(
	interaction: APIInteraction,
): interaction is APIChatInputApplicationCommandInteraction {
	return (
		interaction.type === InteractionType.ApplicationCommand &&
		interaction.data.type === ApplicationCommandType.ChatInput
	);
}

async function handleSpotCommand(
	interaction: APIChatInputApplicationCommandInteraction,
	env: Env,
): Promise<void> {
	const followUp = async (content: string) => {
		await fetch(
			`https://discord.com/api/v10/webhooks/${interaction.application_id}/${interaction.token}/messages/@original`,
			{
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ content, flags: 64 }),
			},
		);
	};

	try {
		const options = interaction.data.options ?? [];

		const getString = (name: string): string | undefined =>
			options.find(
				(o): o is APIApplicationCommandInteractionDataStringOption =>
					o.name === name && o.type === ApplicationCommandOptionType.String,
			)?.value;

		const getAttachmentId = (name: string): string | undefined =>
			options.find(
				(o): o is APIApplicationCommandInteractionDataAttachmentOption =>
					o.name === name && o.type === ApplicationCommandOptionType.Attachment,
			)?.value;

		const parsed = spotInputSchema.safeParse({
			series: getString("series"),
			title: getString("title"),
			description: getString("description"),
			maps_url: getString("maps_url"),
			episode: getString("episode") ?? null,
			imageOptionId: getAttachmentId("image") ?? null,
		});

		if (!parsed.success) {
			await followUp("入力内容が不正です。もう一度お試しください。");
			return;
		}

		const {
			series,
			title,
			description,
			maps_url: mapsUrl,
			episode,
			imageOptionId,
		} = parsed.data;

		const user = interaction.member?.user ?? interaction.user;
		if (!user) throw new Error("No user in interaction");

		const isEligible = await checkMemberAge(user.id, env);
		if (!isEligible) {
			await followUp(
				"投稿にはサーバー参加から3日以上経過している必要があります。",
			);
			return;
		}

		const coords = await parseGoogleMapsUrl(mapsUrl);
		if (!coords) {
			await followUp(
				"Google Maps URLから座標を取得できませんでした。場所のURLを確認してください。",
			);
			return;
		}

		let imageBytes: Uint8Array | null = null;
		if (imageOptionId) {
			const attachment =
				interaction.data?.resolved?.attachments?.[imageOptionId];
			if (attachment) {
				imageBytes = await processImage(attachment.url);
			}
		}

		const prUrl = await createSpotPR(
			{
				series,
				seriesName: SERIES_NAMES[series] ?? series,
				title,
				description,
				episode,
				lat: coords.lat,
				lng: coords.lng,
				imageBytes,
				discordUsername: user.username,
				discordUserId: user.id,
			},
			env,
		);

		await followUp(
			`投稿を受け付けました。レビュー後にマップへ反映されます。\nPR: ${prUrl}`,
		);
	} catch (err) {
		console.error(err);
		await followUp("処理中にエラーが発生しました。").catch(console.error);
	}
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		if (
			req.method !== "POST" ||
			new URL(req.url).pathname !== "/interactions"
		) {
			return new Response(null, { status: 404 });
		}

		const { valid, body } = await verifyDiscordSignature(req, env);
		if (!valid) return new Response(null, { status: 401 });

		const interaction: APIInteraction = JSON.parse(body);

		if (interaction.type === InteractionType.Ping) {
			return new Response(
				JSON.stringify({ type: InteractionResponseType.Pong }),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		if (isChatInputCommand(interaction)) {
			handleSpotCommand(interaction, env).catch(console.error);

			return new Response(
				JSON.stringify({
					type: InteractionResponseType.DeferredChannelMessageWithSource,
					data: { flags: 64 },
				}),
				{ headers: { "Content-Type": "application/json" } },
			);
		}

		return new Response(null, { status: 400 });
	},
};
