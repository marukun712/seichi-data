import { createSignal, For, Show } from "solid-js";
import type { Series, SpotFeature } from "../types.ts";

interface Props {
	series: Series[];
	seriesId: string;
	features: SpotFeature[];
	onSeriesChange: (v: string) => void;
	onSelect: (f: SpotFeature) => void;
}

const FilterBar = (props: Props) => {
	const [results, setResults] = createSignal<SpotFeature[]>([]);

	const search = (q: string) => {
		const lower = q.toLowerCase();
		if (!lower) {
			setResults([]);
			return;
		}
		setResults(
			props.features.filter((f) =>
				f.properties.title.toLowerCase().includes(lower),
			),
		);
	};

	const handleSelect = (f: SpotFeature) => {
		setResults([]);
		props.onSelect(f);
	};

	return (
		<div>
			<div style={{ display: "flex", gap: "12px" }}>
				<select
					value={props.seriesId}
					onInput={(e) => props.onSeriesChange(e.currentTarget.value)}
				>
					<option value="">すべてのシリーズ</option>
					<For each={props.series}>
						{(s) => <option value={s.id}>{s.name}</option>}
					</For>
				</select>
				<input
					type="text"
					placeholder="スポットを検索..."
					onKeyDown={(e) => {
						if (e.key === "Enter") search(e.currentTarget.value);
					}}
				/>
			</div>
			<Show when={results().length > 0}>
				<ul>
					<For each={results()}>
						{(f) => (
							<li>
								<a onClick={() => handleSelect(f)}>{f.properties.title}</a>
							</li>
						)}
					</For>
				</ul>
			</Show>
		</div>
	);
};

export default FilterBar;
