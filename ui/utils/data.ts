import {
	featureResSchema,
	seriesJSONSchema,
	tagsSchema,
} from "../../src/schema.ts";

export async function loadFilters() {
	const seriesRes = await fetch("/series.json");
	const { series } = seriesJSONSchema.parse(await seriesRes.json());

	const tagsRes = await fetch("/tags.json");
	const tags = tagsSchema.parse(await tagsRes.json());

	return { series, tags };
}

export async function loadFeatures(series: string[], tags: string[]) {
	const params = new URLSearchParams();
	for (const s of series) params.append("series", s);
	for (const t of tags) params.append("tags", t);

	const res = await fetch(`/api/features?${params.toString()}`);
	const parsed = featureResSchema.parse(await res.json());

	return parsed;
}
