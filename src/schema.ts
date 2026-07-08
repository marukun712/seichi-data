import { z } from "zod";

export const spotInputSchema = z.object({
	series: z.string().min(1),
	title: z.string().min(1),
	description: z.string().min(1),
	maps_url: z.string().min(1),
	episode: z.string().nullable(),
	imageOptionId: z.string().nullable(),
});

export type SpotInput = z.infer<typeof spotInputSchema>;

export interface SpotData {
	series: string;
	seriesName: string;
	title: string;
	description: string;
	episode: string | null;
	lat: number;
	lng: number;
	imageBytes: Uint8Array | null;
	discordUsername: string;
	discordUserId: string;
}
