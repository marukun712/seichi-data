import { z } from "zod";

export const spotInputSchema = z.object({
	series: z.string().min(1),
	title: z.string().min(1),
	plusCode: z.string().min(1),
	description: z.string().min(1).nullable(),
	imageOptionId: z.string().nullable(),
	tags: z.string().nullable(),
});

export const seriesSchema = z.object({
	id: z.string(),
	name: z.string(),
	color: z.string(),
});

export const seriesJSONSchema = z.object({ series: z.array(seriesSchema) });

export const featureSchema = z.object({
	type: z.literal("Feature"),
	geometry: z.object({
		type: z.literal("Point"),
		coordinates: z.array(z.number()).length(2),
	}),
	properties: z.object({
		title: z.string(),
		description: z.string().optional(),
		image: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
	}),
});

export const geoJSONSchema = z.object({
	features: z.array(featureSchema),
});

export const tagsSchema = z.array(z.string());

export type SpotInput = z.infer<typeof spotInputSchema>;
export type Series = z.infer<typeof seriesSchema>;
export type SeriesJSON = z.infer<typeof seriesJSONSchema>;
export type Feature = z.infer<typeof featureSchema>;
export type GeoJSON = z.infer<typeof geoJSONSchema>;
export type Tags = z.infer<typeof tagsSchema>;

export type FeatureView = z.infer<typeof featureSchema> & {
	properties: { series: Series };
};

export interface SpotData {
	series: Series;
	title: string;
	lat: number;
	lng: number;
	description: string | null;
	imageBytes: Uint8Array | null;
	tags: string[];
	discordUsername: string;
	discordUserId: string;
}
