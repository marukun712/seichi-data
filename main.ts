import {
	DiscordHono,
	makeAttachmentOption,
	makeSlashCommand,
	makeStringOption,
} from "discord-hono";
import { Hono } from "hono";
import { decode } from "pluscodes";
import seriesJson from "./public/series.json" with { type: "json" };
import tagsJson from "./public/tags.json" with { type: "json" };
import { checkMemberAge } from "./src/discord.ts";
import type { Bindings, Env } from "./src/env.ts";
import { findLocation } from "./src/geocode.ts";
import { createSpotPR } from "./src/github.ts";
import { fetchImage } from "./src/image.ts";
import {
	type FeatureView,
	geoJSONSchema,
	seriesJSONSchema,
	spotInputSchema,
	tagsSchema,
} from "./src/schema.ts";

const allSeries = seriesJSONSchema.parse(seriesJson).series;
const allTags = tagsSchema.parse(tagsJson);

const getSeries = (id: string) => allSeries.find((s) => s.id === id);

const features: { type: "FeatureCollection"; features: FeatureView[] } = {
	type: "FeatureCollection",
	features: [],
};

await Promise.all(
	allSeries.map(async (s) => {
		try {
			const geojsonModule = await import(`./public/${s.id}.geojson`, {
				with: { type: "json" },
			});
			const parsed = geoJSONSchema.safeParse(geojsonModule.default);
			if (!parsed.success) {
				console.error(`Invalid geojson for ${s.id}:`, parsed.error);
				return;
			}
			parsed.data.features.forEach((f) => {
				features.features.push({
					type: "Feature",
					id: f.id,
					geometry: f.geometry,
					properties: { ...f.properties, series: s },
				});
			});
		} catch (err) {
			console.error(`Failed to load geojson for ${s.id}:`, err);
		}
	}),
);

export const spotCommand = makeSlashCommand("spot", "聖地を投稿します").options(
	[
		makeStringOption("series", "シリーズ")
			.required(true)
			.choices(seriesJson.series.map((s) => ({ name: s.id, value: s.id }))),
		makeStringOption("title", "場所の名前を入力").required(true),
		makeStringOption("pluscode", "場所コードを入力").required(true),
		makeStringOption("description", "場所の説明を入力"),
		makeStringOption("tags", "タグをカンマ区切りで入力").autocomplete(true),
		makeAttachmentOption("image", "画像 (5MBまで)"),
	],
);

function buildTagAutocompleteChoices(
	rawValue: string,
): { name: string; value: string }[] {
	const segments = rawValue.split(",").map((s) => s.trim());
	// 補完対象は最後のタグ
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

const bot = new DiscordHono<Env>().autocomplete(
	"spot",
	(c) =>
		c.resAutocomplete(
			c.focused
				? buildTagAutocompleteChoices(String(c.focused.value ?? ""))
				: [],
		),
	(c) =>
		c.flags("EPHEMERAL").resDefer(async (c) => {
			try {
				const parsed = spotInputSchema.safeParse({
					series: c.var.series,
					title: c.var.title,
					plusCode: c.var.pluscode,
					description: c.var.description ?? null,
					tags: c.var.tags ?? null,
					image: c.var.image ?? null,
				});

				if (!parsed.success) {
					await c.followup("入力内容が不正です。もう一度お試しください。");
					return;
				}

				const { series, title, plusCode, description, tags, image } =
					parsed.data;

				const selectedTags = [
					...new Set(
						(tags ?? "")
							.split(",")
							.map((t) => t.trim())
							.filter((t) => allTags.includes(t)),
					),
				];

				const seriesData = getSeries(series);
				if (!seriesData) {
					await c.followup("不正なシリーズです");
					return;
				}

				if (plusCode.indexOf("+") !== 8) {
					await c.followup("フルの場所コードを入力してください");
					return;
				}

				const user = c.interaction.member?.user ?? c.interaction.user;
				if (!user) throw new Error("No user in interaction");

				const isEligible = await checkMemberAge(user.id, c.env);
				if (!isEligible) {
					await c.followup(
						"投稿にはサーバー参加から3日以上経過している必要があります。",
					);
					return;
				}

				const coords = decode(plusCode);
				if (!coords) {
					await c.followup("場所コードから座標を取得できませんでした。");
					return;
				}

				let imageBytes: Uint8Array | null = null;

				if (image) {
					const attachment = c.ref.attachments?.[image];
					if (attachment && attachment.size > 5 * 1024 * 1024) {
						await c.followup(
							"画像が大きすぎます。5MB以下の画像を使用してください。",
						);
						return;
					}
					if (attachment) imageBytes = await fetchImage(attachment.url);
				}

				const prUrl = await createSpotPR(
					{
						series: seriesData,
						title,
						lat: coords.latitude,
						lng: coords.longitude,
						description,
						imageBytes,
						tags: selectedTags,
						discordUsername: user.username,
						discordUserId: user.id,
					},
					c.env,
				);

				await c.followup(
					`投稿を受け付けました。レビュー後にマップへ反映されます。\nPR: ${prUrl}`,
				);
			} catch (err) {
				console.error(err);
				await c.followup("処理中にエラーが発生しました。").catch(console.error);
			}
		}),
);

const app = new Hono<{ Bindings: Bindings }>();

app.get("/api/geocode", async (c) => {
	const q = c.req.query("q");
	if (!q) return c.body(null, 400);

	const location = await findLocation(q);
	return c.json({ location });
});

app.get("/api/features", (c) => {
	const series = c.req.queries("series") ?? [];
	const tags = c.req.queries("tags") ?? [];

	const result = features.features.filter((feature) => {
		const seriesMatch =
			series.length === 0 || series.includes(feature.properties.series.id);

		const tagsMatch =
			tags.length === 0 ||
			tags.some((tag) => feature.properties.tags?.includes(tag));

		return seriesMatch && tagsMatch;
	});

	return c.json({
		type: "FeatureCollection",
		features: result,
	});
});

app.mount("/interactions", bot.fetch);

export default app;
