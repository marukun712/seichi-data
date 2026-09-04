import {
	type FeatureView,
	featureSchema,
	geoJSONSchema,
	seriesJSONSchema,
	tagsSchema,
} from "../../src/schema.ts";

export async function loadSeriesAndFeatures() {
	const seriesRes = await fetch("/series.json");
	const { series } = seriesJSONSchema.parse(await seriesRes.json());

	const features: FeatureView[] = [];
	for (const s of series) {
		const geoRes = await fetch(`/${s.id}.geojson`);
		const { features: raw } = geoJSONSchema.parse(await geoRes.json());
		for (const f of raw) {
			const parsed = featureSchema.safeParse(f);
			if (!parsed.success) continue;
			features.push({
				type: "Feature",
				geometry: parsed.data.geometry,
				properties: { ...parsed.data.properties, series: s },
			});
		}
	}

	return { series, features };
}

export async function loadTags() {
	const tagsRes = await fetch("/tags.json");
	return tagsSchema.parse(await tagsRes.json());
}
