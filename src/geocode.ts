import { z } from "zod";

const NOMINATIM_SEARCH_URL = "https://nominatim.openstreetmap.org/search";

const nominatimResponseSchema = z.array(
	z.object({
		lat: z.string(),
		lon: z.string(),
	}),
);

export async function findLocation(
	query: string,
): Promise<{ lat: number; lon: number } | null> {
	const url = new URL(NOMINATIM_SEARCH_URL);
	url.searchParams.set("q", query);
	url.searchParams.set("format", "json");
	url.searchParams.set("limit", "1");

	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"seichi-data (https://github.com/lovelive-academy/seichi-data)",
		},
	});
	if (!res.ok) return null;

	const parsed = nominatimResponseSchema.safeParse(await res.json());
	if (!parsed.success || parsed.data.length === 0) return null;

	const { lat, lon } = parsed.data[0];
	return { lat: Number(lat), lon: Number(lon) };
}
