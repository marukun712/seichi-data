import { Route, Router } from "@solidjs/router";
import { createSignal, onMount, Show } from "solid-js";
import type { FeatureView, Series } from "../src/schema.ts";
import About from "./components/About.tsx";
import Card from "./components/Card.tsx";
import Filter from "./components/Filter.tsx";
import MapView from "./components/MapView.tsx";
import { createSpotFilter } from "./hooks/createSpotFilter.ts";
import Register from "./pages/Register.tsx";
import { loadSeriesAndFeatures, loadTags } from "./utils/data.ts";

const Home = () => {
	const [series, setSeries] = createSignal<Series[]>([]);
	const [tags, setTags] = createSignal<string[]>([]);
	const [allFeatures, setAllFeatures] = createSignal<FeatureView[]>([]);
	const [selected, setSelected] = createSignal<FeatureView | null>(null);

	const {
		selectedSeries,
		selectedTags,
		filtered,
		seriesColor,
		toggleSeries,
		clearSeries,
		toggleTag,
	} = createSpotFilter({ series, allFeatures });

	onMount(async () => {
		const { series, features } = await loadSeriesAndFeatures();
		setSeries(series);
		setAllFeatures(features);
		setTags(await loadTags());
	});

	return (
		<main>
			<Show when={series().length > 0}>
				<MapView
					features={filtered()}
					selected={selected()}
					seriesColor={seriesColor()}
					onFeatureClick={setSelected}
				/>
			</Show>
			<About />
			<Filter
				series={series()}
				selectedSeries={selectedSeries()}
				tags={tags()}
				selectedTags={selectedTags()}
				features={filtered()}
				onSeriesToggle={toggleSeries}
				onSeriesClear={clearSeries}
				onTagToggle={toggleTag}
				onFeatureSelect={setSelected}
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
