import { For } from "solid-js";
import type { Feature, FeatureView, Series } from "../../src/schema.ts";
import { createFeatureSearch } from "../hooks/createFeatureSearch.ts";

interface Props {
	series: Series[];
	selectedSeries: string[];
	tags: string[];
	selectedTags: string[];
	features: FeatureView[];
	onSeriesToggle: (id: string) => void;
	onSeriesClear: () => void;
	onTagToggle: (tag: string) => void;
	onFeatureSelect: (f: Feature) => void;
}

const inactiveStyle = {
	background: "var(--pico-card-background-color)",
	color: "var(--pico-muted-color)",
	"border-color": "var(--pico-muted-border-color)",
	"box-shadow": "none",
};

const Filter = (props: Props) => {
	const { results, search } = createFeatureSearch(() => props.features);

	const onSearchInput = (q: string) => {
		const exact = search(q);
		if (exact) {
			props.onFeatureSelect(exact);
		}
	};

	return (
		<article
			style={{
				position: "fixed",
				left: "16px",
				right: "16px",
				bottom: "16px",
				"z-index": 1,
			}}
		>
			<input
				type="text"
				placeholder="スポットを検索..."
				list="search-results"
				onInput={(e) => onSearchInput(e.currentTarget.value)}
			/>
			<datalist id="search-results">
				<For each={results()}>
					{(f) => <option value={f.properties.title} />}
				</For>
			</datalist>
			<button
				type="button"
				style={props.selectedSeries.length === 0 ? {} : inactiveStyle}
				onClick={props.onSeriesClear}
			>
				すべて
			</button>
			<div
				style={{
					display: "flex",
					"flex-wrap": "wrap",
					gap: "16px",
					"align-items": "center",
				}}
			>
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
			<div
				style={{
					display: "flex",
					"flex-wrap": "wrap",
					gap: "16px",
					"align-items": "center",
				}}
			>
				<For each={props.tags}>
					{(tag) => (
						<label>
							<input
								type="checkbox"
								checked={props.selectedTags.includes(tag)}
								onChange={() => props.onTagToggle(tag)}
							/>
							{tag}
						</label>
					)}
				</For>
			</div>
		</article>
	);
};

export default Filter;
