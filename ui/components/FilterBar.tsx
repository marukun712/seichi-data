import { createSignal, For } from "solid-js";
import type { Feature, FeatureView, Series } from "../../src/schema.ts";

interface Props {
	series: Series[];
	currentSeries: string;
	features: FeatureView[];
	onSeriesChange: (v: string) => void;
	onFeatureSelect: (f: Feature) => void;
}

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
			<div style={{ display: "flex", gap: "12px" }}>
				<select
					value={props.currentSeries}
					onInput={(e) => props.onSeriesChange(e.currentTarget.value)}
				>
					<option value="all">すべてのシリーズ</option>
					<For each={props.series}>
						{(s) => <option value={s.id}>{s.name}</option>}
					</For>
				</select>
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
