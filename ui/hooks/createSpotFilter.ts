import { createSignal } from "solid-js";
import type { FeatureView, Series } from "../../src/schema.ts";

interface Params {
	series: () => Series[];
	allFeatures: () => FeatureView[];
}

export function createSpotFilter(params: Params) {
	const [selectedSeries, setSelectedSeries] = createSignal<string[]>([]);
	const [selectedTags, setSelectedTags] = createSignal<string[]>([]);

	const filtered = (): FeatureView[] => {
		const ids = selectedSeries();
		const tags = selectedTags();
		return params.allFeatures().filter((f) => {
			const matchesSeries =
				ids.length === 0 || ids.includes(f.properties.series.id);
			const featureTags = f.properties.tags ?? [];
			const matchesTags =
				tags.length === 0 || tags.some((t) => featureTags.includes(t));
			return matchesSeries && matchesTags;
		});
	};

	const seriesColor = (): string | null => {
		const ids = selectedSeries();
		if (ids.length !== 1) return null;
		return params.series().find((s) => s.id === ids[0])?.color ?? null;
	};

	const toggleSeries = (id: string) => {
		setSelectedSeries((prev) =>
			prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
		);
	};

	const clearSeries = () => setSelectedSeries([]);

	const toggleTag = (tag: string) => {
		setSelectedTags((prev) =>
			prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
		);
	};

	return {
		selectedSeries,
		selectedTags,
		filtered,
		seriesColor,
		toggleSeries,
		clearSeries,
		toggleTag,
	};
}
