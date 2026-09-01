import { z } from "zod";

const nominatimSchema = z.array(
	z.object({
		lat: z.string(),
		lon: z.string(),
		display_name: z.string(),
	}),
);

export async function searchLocation(
	query: string,
): Promise<{ lat: number; lon: number } | null> {
	const res = await fetch(
		`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
			query,
		)}&format=json&limit=1`,
	);
	const results = nominatimSchema.parse(await res.json());
	if (results.length === 0) return null;

	const { lat, lon } = results[0];
	return { lat: Number(lat), lon: Number(lon) };
}
