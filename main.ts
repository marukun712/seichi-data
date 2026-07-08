import { checkMemberAge, verifyDiscordSignature } from "./src/discord.ts";
import { createSpotPR } from "./src/github.ts";
import { processImage } from "./src/image.ts";
import { parseGoogleMapsUrl } from "./src/maps.ts";

const SERIES_NAMES: Record<string, string> = {
	lovelive: "ラブライブ！",
	sunshine: "ラブライブ！サンシャイン!!",
	nijigasaki: "ラブライブ！虹ヶ咲学園スクールアイドル同好会",
	superstar: "ラブライブ！スーパースター!!",
	hasunosora: "ラブライブ！蓮ノ空女学院スクールアイドルクラブ",
	musical: "スクールアイドルミュージカル",
	ikizulive: "イキヅライブ！LOVELIVE! BLUEBIRD",
};

interface DiscordOption {
	name: string;
	value: string;
}

interface DiscordAttachment {
	url: string;
}

interface DiscordInteraction {
	type: number;
	token: string;
	application_id: string;
	data?: {
		options: DiscordOption[];
		resolved?: {
			attachments?: Record<string, DiscordAttachment>;
		};
	};
	member?: {
		user: { id: string; username: string };
	};
	user?: { id: string; username: string };
}

async function handleSpotCommand(
	interaction: DiscordInteraction,
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
		const options = interaction.data?.options ?? [];
		const getOption = (name: string) =>
			options.find((o) => o.name === name)?.value;
		const getRequiredOption = (name: string): string => {
			const value = getOption(name);
			if (!value) throw new Error(`Missing required option: ${name}`);
			return value;
		};

		const series = getRequiredOption("series");
		const description = getRequiredOption("description");
		const mapsUrl = getRequiredOption("maps_url");
		const episode = getOption("episode") ?? null;
		const imageOptionId = getOption("image") ?? null;

		const user = interaction.member?.user ?? interaction.user;
		if (!user) throw new Error("No user in interaction");

		const isEligible = await checkMemberAge(user.id);
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

		const prUrl = await createSpotPR({
			series,
			seriesName: SERIES_NAMES[series] ?? series,
			description,
			episode,
			lat: coords.lat,
			lng: coords.lng,
			imageBytes,
			discordUsername: user.username,
			discordUserId: user.id,
		});

		await followUp(
			`投稿を受け付けました。レビュー後にマップへ反映されます。\nPR: ${prUrl}`,
		);
	} catch (err) {
		console.error(err);
		await followUp("処理中にエラーが発生しました。").catch(console.error);
	}
}

Deno.serve(async (req: Request) => {
	if (req.method !== "POST" || new URL(req.url).pathname !== "/interactions") {
		return new Response(null, { status: 404 });
	}

	const { valid, body } = await verifyDiscordSignature(req);
	if (!valid) return new Response(null, { status: 401 });

	const interaction: DiscordInteraction = JSON.parse(body);

	if (interaction.type === 1) {
		return new Response(JSON.stringify({ type: 1 }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	if (interaction.type === 2) {
		handleSpotCommand(interaction).catch(console.error);

		return new Response(JSON.stringify({ type: 5, data: { flags: 64 } }), {
			headers: { "Content-Type": "application/json" },
		});
	}

	return new Response(null, { status: 400 });
});
