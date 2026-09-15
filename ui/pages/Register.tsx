import { Search } from "lucide-solid/icons";
import * as maplibregl from "maplibre-gl";
import { encode } from "pluscodes";
import { type Component, createSignal, onMount } from "solid-js";
import { loadTwitterWidgets } from "../utils/twitter.ts";
import "./Register.css";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

const PluscodeMap = () => {
	let container!: HTMLDivElement;
	let map: maplibregl.Map | undefined;
	let marker: maplibregl.Marker | undefined;

	const [plusCode, setPlusCode] = createSignal<string | null>(null);
	const [copied, setCopied] = createSignal(false);
	const [query, setQuery] = createSignal("");

	const copyPlusCode = async () => {
		const code = plusCode();
		if (!code) return;
		await navigator.clipboard.writeText(code);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const search = async () => {
		const q = query().trim();
		if (!q || !map) return;

		const res = await fetch(`/api/geocode?q=${encodeURIComponent(q)}`);
		if (!res.ok) return;

		const body: { location: { lat: number; lon: number } | null } =
			await res.json();
		if (!body.location) return;

		map.flyTo({ center: [body.location.lon, body.location.lat], zoom: 15 });
	};

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

	return (
		<div>
			<input
				type="text"
				placeholder="場所を検索..."
				value={query()}
				onInput={(e) => setQuery(e.currentTarget.value)}
				onKeyDown={(e) => e.key === "Enter" && search()}
			/>
			<button type="button" onClick={search}>
				<Search />
				検索
			</button>
			<input
				type="text"
				readonly
				value={plusCode() ?? "地図をクリックして取得"}
			/>
			<button type="button" onClick={copyPlusCode} disabled={!plusCode()}>
				{copied() ? "コピーしました" : "コピー"}
			</button>
			<div ref={container} class="pluscode-map" />
		</div>
	);
};

const Register: Component = () => {
	onMount(() => {
		loadTwitterWidgets();
	});

	return (
		<main class="container register-main">
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
				<li>
					<strong>tags</strong>: タグ(任意)
				</li>
			</ul>
		</main>
	);
};

export default Register;
