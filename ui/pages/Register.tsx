import { A } from "@solidjs/router";
import * as maplibregl from "maplibre-gl";
import { encode } from "pluscodes";
import { type Component, createSignal, onMount } from "solid-js";
import { z } from "zod";

declare global {
	interface Window {
		twttr?: { widgets: { load: () => void } };
	}
}

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const nominatimSchema = z.array(
	z.object({
		lat: z.string(),
		lon: z.string(),
		display_name: z.string(),
	}),
);

const PluscodeMap = () => {
	let container: HTMLDivElement | undefined;
	let map: maplibregl.Map | undefined;
	let marker: maplibregl.Marker | undefined;

	const [plusCode, setPlusCode] = createSignal<string | null>(null);
	const [copied, setCopied] = createSignal(false);
	const [query, setQuery] = createSignal("");

	onMount(() => {
		if (!container) return;
		maplibregl.setWorkerUrl(
			"https://esm.sh/maplibre-gl@6.0.0/dist/maplibre-gl-worker.mjs",
		);
		map = new maplibregl.Map({
			container,
			style: MAP_STYLE,
			center: [137.5, 36.5],
			zoom: 5,
		});
		map.on("click", (e) => {
			const { lat, lng } = e.lngLat;
			const code = encode({ latitude: lat, longitude: lng }, 10);
			if (!code) return;
			setPlusCode(code);

			marker?.remove();
			marker = new maplibregl.Marker()
				.setLngLat([lng, lat])
				.addTo(map as maplibregl.Map);
		});
	});

	const search = async () => {
		const q = query().trim();
		if (!q) return;
		const res = await fetch(
			`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
				q,
			)}&format=json&limit=1`,
		);
		const results = nominatimSchema.parse(await res.json());
		if (results.length === 0) return;
		const { lat, lon } = results[0];
		map?.flyTo({ center: [Number(lon), Number(lat)], zoom: 15 });
	};

	const copy = async () => {
		const code = plusCode();
		if (!code) return;
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div>
			<div style={{ display: "flex", gap: "8px" }}>
				<input
					type="text"
					placeholder="場所を検索..."
					value={query()}
					style={{ width: "auto", flex: 1 }}
					onInput={(e) => setQuery(e.currentTarget.value)}
					onKeyDown={(e) => e.key === "Enter" && search()}
				/>
				<button type="button" onClick={search}>
					検索
				</button>
			</div>
			<div ref={container} class="map-container" />
			<div
				style={{
					display: "flex",
					gap: "8px",
				}}
			>
				<input
					type="text"
					readonly
					style={{ width: "auto", flex: 1 }}
					value={plusCode() ?? "地図をクリックして取得"}
				/>
				<button type="button" onClick={copy} disabled={!plusCode()}>
					{copied() ? "コピーしました" : "コピー"}
				</button>
			</div>
		</div>
	);
};

const Register: Component = () => {
	onMount(() => {
		if (globalThis.window.twttr) {
			globalThis.window.twttr.widgets.load();
			return;
		}
		const script = document.createElement("script");
		script.src = "https://platform.x.com/widgets.js";
		script.async = true;
		document.body.appendChild(script);
	});

	return (
		<main>
			<A href="/">← 地図に戻る</A>
			<h2>聖地情報の登録方法</h2>
			<p>
				聖地情報を登録するためには、ラブライブ！学会オープンサーバーに参加する必要があります。
			</p>
			<blockquote class="twitter-tweet">
				<p lang="ja" dir="ltr">
					🎉Discordオープンサーバー開設🎉
					<br />
					ラブライブ！シリーズが好きなファンが、良さを気軽に語り合い、布教できる場を作るべく、Discordサーバーをオープン化しました✨
					<br />
					ラブライブ！シリーズが好きな方、どなたでもお気軽にご参加ください🔥
					<br />
					⬇️参加はこちら
					<a href="https://t.co/vzno0sheUa">https://t.co/vzno0sheUa</a>
				</p>
				&mdash; ラブライブ！学会【C108 日曜日東3ホール マ12b】
				(@LoveLiveAcademy)
				<a href="https://x.com/LoveLiveAcademy/status/1958855557533896858?ref_src=twsrc%5Etfw">
					August 22, 2025
				</a>
			</blockquote>

			<h3>場所コードを取得する</h3>
			<p>地図をクリックするとその地点の場所コードが表示されます。</p>
			<PluscodeMap />
			<h3>登録手順</h3>
			<ol>
				<li>オープンサーバーに参加する(申請には、参加から3日以上経過が必要)</li>
				<li>上の地図でスポットの場所コードを取得する</li>
				<li>
					Discordのチャット入力欄に<code>/spot</code>
					と入力し、表示される各項目を埋める
				</li>
				<li>「投稿を受け付けました」と表示されたら、申請完了！</li>
			</ol>
			<h3>入力項目</h3>
			<ul>
				<li>
					<strong>series</strong>: 対象シリーズ
				</li>
				<li>
					<strong>title</strong>: スポット名
				</li>
				<li>
					<strong>pluscode</strong>: 場所コード(例: 8Q7XPQ5W+8W)
				</li>
				<li>
					<strong>description</strong>: 説明(任意)
				</li>
				<li>
					<strong>image</strong>: 画像(任意、5MB以下)
				</li>
			</ul>
		</main>
	);
};

export default Register;
