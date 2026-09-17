import { Route, Router } from "@solidjs/router";
import { createEffect, createSignal, onMount, Show } from "solid-js";
import type { FeatureView, Series } from "../src/schema.ts";
import About from "./components/About.tsx";
import Card from "./components/Card.tsx";
import Filter from "./components/Filter.tsx";
import MapView from "./components/MapView.tsx";
import Register from "./pages/Register.tsx";
import { loadFeatures, loadFilters } from "./utils/data.ts";

const Home = () => {
	const [series, setSeries] = createSignal<Series[]>([]);
	const [tags, setTags] = createSignal<string[]>([]);
	const [selectedSeries, setSelectedSeries] = createSignal<string[]>([]);
	const [selectedTags, setSelectedTags] = createSignal<string[]>([]);
	const [features, setFeatures] = createSignal<FeatureView[]>([]);
	const [selected, setSelected] = createSignal<FeatureView | null>(null);
	const [filterOpen, setFilterOpen] = createSignal(false);

	const toggleSeries = (id: string) => {
		setSelectedSeries((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const clearSeries = () => setSelectedSeries([]);

	const seriesColor = (): string | null => {
		const ids = selectedSeries();
		if (ids.length !== 1) return null;
		return series().find((s) => s.id === ids[0])?.color ?? null;
	};

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
		);
	};

	onMount(async () => {
		const { series, tags } = await loadFilters();
		setSeries(series);
		setTags(tags);
	});

	createEffect(async () => {
		const { features } = await loadFeatures(selectedSeries(), selectedTags());
		setFeatures(features);
	});

	return (
		<main>
			<MapView
				features={features()}
				seriesColor={seriesColor()}
				onFeatureClick={setSelected}
			/>
			<About
				resultCount={features().length}
				onOpenFilter={() => setFilterOpen(true)}
			/>
			<Filter
				open={filterOpen()}
				onClose={() => setFilterOpen(false)}
				resultCount={features().length}
				series={series()}
				selectedSeries={selectedSeries()}
				tags={tags()}
				selectedTags={selectedTags()}
				onSeriesToggle={toggleSeries}
				onSeriesClear={clearSeries}
				onTagToggle={toggleTag}
			/>
			<Show when={selected()}>
				{(feature) => (
					<Card feature={feature()} onClose={() => setSelected(null)} />
				)}
			</Show>
		</main>
	);
};

const App = () => (
	<div>
		<Router>
			<Route path="/" component={Home} />
			<Route path="/register" component={Register} />
		</Router>
	</div>
);

export default App;
