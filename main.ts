import type { ExecutionContext } from "@cloudflare/workers-types";
import type {
	APIApplicationCommandAutocompleteInteraction,
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
import tagsJson from "./public/tags.json" with { type: "json" };
import { checkMemberAge, verifyDiscordSignature } from "./src/discord.ts";
import { createSpotPR } from "./src/github.ts";
import { fetchImage } from "./src/image.ts";
import { seriesSchema, spotInputSchema, tagsSchema } from "./src/schema.ts";

const getSeries = (id: string) =>
	seriesSchema.parse(seriesJson.series.find((s) => s.id === id));

const allTags = tagsSchema.parse(tagsJson);

// tagsオプションは「tag1,tag2,」のようなカンマ区切り文字列として運用し、
// 最後の(未確定の)セグメントをtags.jsonと前方一致させて補完候補を返す
function buildTagAutocompleteChoices(
	rawValue: string,
): { name: string; value: string }[] {
	const segments = rawValue.split(",").map((s) => s.trim());
	const currentSegment = segments[segments.length - 1] ?? "";
	const confirmedTags = segments.slice(0, -1).filter((s) => s.length > 0);

	return allTags
		.filter(
			(tag) => tag.startsWith(currentSegment) && !confirmedTags.includes(tag),
		)
		.map((tag) => {
			const value = `${[...confirmedTags, tag].join(",")},`;
			return { name: value, value };
		});
}

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

// APIInteractionは複数の種類のInteractionを合わせたUnion型なので、
// スラッシュコマンド用の処理に進む前に型を絞り込む必要がある
function isChatInputCommand(
	interaction: APIInteraction,
): interaction is APIChatInputApplicationCommandInteraction {
	return (
		interaction.type === InteractionType.ApplicationCommand &&
		interaction.data.type === ApplicationCommandType.ChatInput
	);
}

function isAutocomplete(
	interaction: APIInteraction,
): interaction is APIApplicationCommandAutocompleteInteraction {
	return interaction.type === InteractionType.ApplicationCommandAutocomplete;
}

function handleTagsAutocomplete(
	interaction: APIApplicationCommandAutocompleteInteraction,
): Response {
	const options = interaction.data.options ?? [];
	const focused = options.find(
		(o): o is APIApplicationCommandInteractionDataStringOption =>
			o.name === "tags" &&
			o.type === ApplicationCommandOptionType.String &&
			"focused" in o &&
			o.focused === true,
	);

	const choices = focused ? buildTagAutocompleteChoices(focused.value) : [];

	return new Response(
		JSON.stringify({
			type: InteractionResponseType.ApplicationCommandAutocompleteResult,
			data: { choices },
		}),
		{ headers: { "Content-Type": "application/json" } },
	);
}

async function handleSpotCommand(
	interaction: APIChatInputApplicationCommandInteraction,
	env: Env,
): Promise<void> {
	// Discordはインタラクションへの応答を3秒以内に返す必要があるため、
	// 先にDeferredで応答しておき、後からこの関数で結果を編集して伝える
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
			tags: getString("tags") ?? null,
		});

		if (!parsed.success) {
			await followUp("入力内容が不正です。もう一度お試しください。");
			return;
		}

		const { series, title, plusCode, description, imageOptionId, tags } =
			parsed.data;

		// tags.jsonに存在するタグのみを有効な入力として扱う(重複は除く)
		const selectedTags = [
			...new Set(
				(tags ?? "")
					.split(",")
					.map((t) => t.trim())
					.filter((t) => allTags.includes(t)),
			),
		];

		// 短縮形の場所コードは基準位置がないと座標に変換できないため、
		// "+"が9文字目にあるフル桁の場所コードのみ受け付ける
		if (plusCode.indexOf("+") !== 8) {
			await followUp("フルの場所コードを入力してください");
			return;
		}

		const user = interaction.member?.user ?? interaction.user;
		if (!user) throw new Error("No user in interaction");

		// 参加直後のアカウントによる荒らし投稿を防ぐための制限
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
				tags: selectedTags,
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

		if (isAutocomplete(interaction)) {
			return handleTagsAutocomplete(interaction);
		}

		if (isChatInputCommand(interaction)) {
			// GitHub PR作成などの処理は3秒のDiscord応答期限に収まらない可能性があるため、
			// 先にDeferredを返してからwaitUntilでWorkerを終了させずに処理を継続する
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
