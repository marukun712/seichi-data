import { A } from "@solidjs/router";
import { createSignal, For } from "solid-js";
import type { Feature, FeatureView, Series } from "../../src/schema.ts";

interface Props {
	series: Series[];
	selectedSeries: string[];
	features: FeatureView[];
	onSeriesToggle: (id: string) => void;
	onSeriesClear: () => void;
	onFeatureSelect: (f: Feature) => void;
}

const inactiveStyle = {
	background: "#fff",
	color: "var(--ll-ink-soft)",
	"border-color": "var(--ll-hairline)",
	"box-shadow": "none",
};

const FilterBar = (props: Props) => {
	const [results, setResults] = createSignal<Feature[]>([]);

	const search = (q: string) => {
		const lower = q.toLowerCase();

		const filtered = props.features.filter((f) =>
			f.properties.title.toLowerCase().includes(lower),
		);
		setResults(filtered);

		const exact = props.features.find((f) => f.properties.title === q);
		if (exact) {
			props.onFeatureSelect(exact);
		}
	};

	return (
		<div>
			<div>
				<p>ラブライブ！シリーズの聖地情報をまとめたマップです。</p>
				<A href="/register">
					<button type="button">聖地を登録する</button>
				</A>
			</div>
			<div
				style={{
					display: "flex",
					"flex-wrap": "wrap",
					gap: "8px",
					"margin-top": "24px",
				}}
			>
				<button
					type="button"
					style={props.selectedSeries.length === 0 ? {} : inactiveStyle}
					onClick={props.onSeriesClear}
				>
					すべて
				</button>
				<For each={props.series}>
					{(s) => {
						const isActive = () => props.selectedSeries.includes(s.id);
						return (
							<button
								type="button"
								style={
									isActive()
										? { background: s.color, "border-color": s.color }
										: inactiveStyle
								}
								onClick={() => props.onSeriesToggle(s.id)}
							>
								{s.name}
							</button>
						);
					}}
				</For>
			</div>
			<div style={{ display: "flex", gap: "12px", "margin-top": "16px" }}>
				<input
					type="text"
					placeholder="スポットを検索..."
					list="search-results"
					onInput={(e) => search(e.currentTarget.value)}
				/>
				<datalist id="search-results">
					<For each={results()}>
						{(f) => <option value={f.properties.title} />}
					</For>
				</datalist>
			</div>
		</div>
	);
};

export default FilterBar;
