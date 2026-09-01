import { type Component, createSignal, onMount } from "solid-js";
import { createClipboardCopy } from "../hooks/createClipboardCopy.ts";
import { createPlusCodePicker } from "../hooks/createPlusCodePicker.ts";
import { searchLocation } from "../utils/geocode.ts";
import { loadTwitterWidgets } from "../utils/twitter.ts";

const PluscodeMap = () => {
	const { plusCode, setContainer, flyTo } = createPlusCodePicker();
	const { copied, copy } = createClipboardCopy();
	const [query, setQuery] = createSignal("");

	const search = async () => {
		const q = query().trim();
		if (!q) return;
		const location = await searchLocation(q);
		if (!location) return;
		flyTo(location.lat, location.lon);
	};

	const copyPlusCode = () => {
		const code = plusCode();
		if (!code) return;
		copy(code);
	};

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
			<div ref={setContainer} style={{ height: "50vh" }} />
		</div>
	);
};

const Register: Component = () => {
	onMount(() => {
		loadTwitterWidgets();
	});

	return (
		<main class="container" style={{ "margin-top": "6vh" }}>
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
