import { createSignal } from "solid-js";
import type { Feature, FeatureView } from "../../src/schema.ts";
import {
	findFeatureByExactTitle,
	searchFeaturesByTitle,
} from "../utils/search.ts";

export function createFeatureSearch(features: () => FeatureView[]) {
	const [results, setResults] = createSignal<Feature[]>([]);

	const search = (query: string): Feature | undefined => {
		setResults(searchFeaturesByTitle(features(), query));
		return findFeatureByExactTitle(features(), query);
	};

	return { results, search };
}
