import type { Feature, FeatureView } from "../../src/schema.ts";

export function searchFeaturesByTitle(
	features: FeatureView[],
	query: string,
): Feature[] {
	const lower = query.toLowerCase();
	return features.filter((f) =>
		f.properties.title.toLowerCase().includes(lower),
	);
}

export function findFeatureByExactTitle(
	features: FeatureView[],
	query: string,
): Feature | undefined {
	return features.find((f) => f.properties.title === query);
}
