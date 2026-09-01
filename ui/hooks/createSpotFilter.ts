import { createSignal } from "solid-js";
import type { FeatureView, Series } from "../../src/schema.ts";

interface Params {
	series: () => Series[];
	allFeatures: () => FeatureView[];
}

export function createSpotFilter(params: Params) {
	const [selectedSeries, setSelectedSeries] = createSignal<string[]>([]);

	const filtered = (): FeatureView[] => {
		const ids = selectedSeries();
		if (ids.length === 0) return params.allFeatures();
		return params
			.allFeatures()
			.filter((f) => ids.includes(f.properties.series.id));
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

	return { selectedSeries, filtered, seriesColor, toggleSeries, clearSeries };
}
