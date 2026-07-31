import { createSignal, onMount, Show } from "solid-js";
import type { FeatureView, Series } from "../src/schema.ts";
import Card from "./components/Card.tsx";
import FilterBar from "./components/FilterBar.tsx";
import Header from "./components/Header.tsx";
import MapView from "./components/MapView.tsx";
import { loadSeriesAndFeatures } from "./utils/data.ts";

const App = () => {
	const [series, setSeries] = createSignal<Series[]>([]);
	const [allFeatures, setAllFeatures] = createSignal<FeatureView[]>([]);

	const [currentSeries, setCurrentSeries] = createSignal("all");
	const [selected, setSelected] = createSignal<FeatureView | null>(null);

	onMount(async () => {
		const { series, features } = await loadSeriesAndFeatures();
		setSeries(series);
		setAllFeatures(features);
	});

	const filtered = (): FeatureView[] => {
		const sid = currentSeries();
		console.log(sid);
		if (sid === "all") return allFeatures();
		return allFeatures().filter((f) => f.properties.series.id === sid);
	};

	const seriesColor = (): string | null => {
		const sid = currentSeries();
		if (sid === "all") return null;
		return series().find((s) => s.id === sid)?.color ?? null;
	};

	return (
		<div class="viewer">
			<Header />
			<main>
				<FilterBar
					series={series()}
					currentSeries={currentSeries()}
					features={filtered()}
					onSeriesChange={setCurrentSeries}
					onFeatureSelect={setSelected}
				/>
				<div class="map-area">
					<Show when={series().length > 0}>
						<MapView
							features={filtered()}
							selected={selected()}
							seriesColor={seriesColor()}
							onFeatureClick={setSelected}
						/>
					</Show>
					<Show when={selected()}>
						{(feature) => (
							<Card feature={feature()} onClose={() => setSelected(null)} />
						)}
					</Show>
				</div>
			</main>
		</div>
	);
};

export default App;
