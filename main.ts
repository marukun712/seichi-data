import type { ExecutionContext } from "@cloudflare/workers-types";
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
import { decode } from "pluscodes";
import seriesJson from "./public/series.json" with { type: "json" };
import { checkMemberAge, verifyDiscordSignature } from "./src/discord.ts";
import { createSpotPR } from "./src/github.ts";
import { fetchImage } from "./src/image.ts";
import { seriesSchema, spotInputSchema } from "./src/schema.ts";

const getSeries = (id: string) =>
	seriesSchema.parse(seriesJson.series.find((s) => s.id === id));

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
			plusCode: getString("pluscode"),
			description: getString("description") ?? null,
			imageOptionId: getAttachmentId("image") ?? null,
		});

		if (!parsed.success) {
			await followUp("入力内容が不正です。もう一度お試しください。");
			return;
		}

		const { series, title, plusCode, description, imageOptionId } = parsed.data;

		if (plusCode.indexOf("+") !== 8) {
			await followUp("フルの場所コードを入力してください");
			return;
		}

		const user = interaction.member?.user ?? interaction.user;
		if (!user) throw new Error("No user in interaction");

		const isEligible = await checkMemberAge(user.id, env);
		if (!isEligible) {
			await followUp(
				"投稿にはサーバー参加から3日以上経過している必要があります。",
			);
			return;
		}

		const coords = decode(plusCode);
		if (!coords) {
			await followUp("場所コードから座標を取得できませんでした。");
			return;
		}

		let imageBytes: Uint8Array | null = null;

		const attachment = imageOptionId
			? interaction.data?.resolved?.attachments?.[imageOptionId]
			: undefined;

		if (attachment) {
			if (attachment.size > 5 * 1024 * 1024) {
				await followUp("画像が大きすぎます。5MB以下の画像を使用してください。");
				return;
			}

			imageBytes = await fetchImage(attachment.url);
		}

		const prUrl = await createSpotPR(
			{
				series: getSeries(series),
				title,
				lat: coords.latitude,
				lng: coords.longitude,
				description,
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
	async fetch(
		req: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
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
			ctx.waitUntil(handleSpotCommand(interaction, env).catch(console.error));

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
