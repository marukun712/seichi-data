import { Route, Router } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import type { FeatureView, Series } from "../src/schema.ts";
import Card from "./components/Card.tsx";
import FilterBar from "./components/FilterBar.tsx";
import Header from "./components/Header.tsx";
import MapView from "./components/MapView.tsx";
import Register from "./pages/Register.tsx";
import { loadSeriesAndFeatures } from "./utils/data.ts";

const Home = () => {
	const [series, setSeries] = createSignal<Series[]>([]);
	const [allFeatures, setAllFeatures] = createSignal<FeatureView[]>([]);

	const [selectedSeries, setSelectedSeries] = createSignal<string[]>([]);
	const [selected, setSelected] = createSignal<FeatureView | null>(null);

	onMount(async () => {
		const { series, features } = await loadSeriesAndFeatures();
		setSeries(series);
		setAllFeatures(features);
	});

	const filtered = (): FeatureView[] => {
		const ids = selectedSeries();
		if (ids.length === 0) return allFeatures();
		return allFeatures().filter((f) => ids.includes(f.properties.series.id));
	};

	const seriesColor = (): string | null => {
		const ids = selectedSeries();
		if (ids.length !== 1) return null;
		return series().find((s) => s.id === ids[0])?.color ?? null;
	};

	const toggleSeries = (id: string) => {
		setSelectedSeries((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	return (
		<main>
			<FilterBar
				series={series()}
				selectedSeries={selectedSeries()}
				features={filtered()}
				onSeriesToggle={toggleSeries}
				onSeriesClear={() => setSelectedSeries([])}
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
	);
};

const App = () => (
	<div class="viewer">
		<Header />
		<Router>
			<Route path="/" component={Home} />
			<Route path="/register" component={Register} />
		</Router>
	</div>
);

export default App;
