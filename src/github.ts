import { Buffer } from "node:buffer";
import { createPrivateKey } from "node:crypto";
import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "octokit";
import type { Env } from "../main.ts";
import { getEnv } from "./env.ts";
import { type Feature, geoJSONSchema, type SpotData } from "./schema.ts";

function toP8Pem(pem: string): string {
	if (!pem.includes("BEGIN RSA PRIVATE KEY")) return pem;
	return createPrivateKey(pem).export({
		type: "pkcs8",
		format: "pem",
	}) as string;
}

function createOctokit(env: Env): Octokit {
	return new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: getEnv(env, "GITHUB_APP_ID"),
			privateKey: toP8Pem(getEnv(env, "GITHUB_APP_PRIVATE_KEY")),
			installationId: getEnv(env, "GITHUB_INSTALLATION_ID"),
		},
	});
}

export async function createSpotPR(spot: SpotData, env: Env): Promise<string> {
	const octokit = createOctokit(env);
	const owner = getEnv(env, "GITHUB_REPO_OWNER");
	const repo = getEnv(env, "GITHUB_REPO_NAME");
	const uuid = crypto.randomUUID();
	const branchName = `add-spot/${uuid}`;

	const { data: ref } = await octokit.rest.git.getRef({
		owner,
		repo,
		ref: "heads/main",
	});

	await octokit.rest.git.createRef({
		owner,
		repo,
		ref: `refs/heads/${branchName}`,
		sha: ref.object.sha,
	});

	const { data: existingFile } = await octokit.rest.repos.getContent({
		owner,
		repo,
		path: `public/${spot.series.id}.geojson`,
	});

	if (Array.isArray(existingFile) || !("content" in existingFile)) {
		throw new Error("Unexpected file response");
	}

	const rawContent = existingFile.content.replace(/\n/g, "");
	const contentBytes = Uint8Array.from(atob(rawContent), (c) =>
		c.charCodeAt(0),
	);

	const geojson = JSON.parse(new TextDecoder().decode(contentBytes));
	const parsed = geoJSONSchema.safeParse(geojson);

	if (!parsed.success) {
		throw new Error("Invalid GeoJSON");
	}

	const newFeature: Feature = {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: [spot.lng, spot.lat],
		},
		properties: {
			title: spot.title,
		},
	};

	if (spot.description) {
		newFeature.properties.description = spot.description;
	}
	if (spot.imageBytes) {
		newFeature.properties.image = `images/${uuid}.jpg`;
	}

	geojson.features.push(newFeature);

	await octokit.rest.repos.createOrUpdateFileContents({
		owner,
		repo,
		path: `public/${spot.series.id}.geojson`,
		message: `Add spot: ${spot.title}`,
		content: Buffer.from(JSON.stringify(geojson, null, 2)).toString("base64"),
		sha: existingFile.sha,
		branch: branchName,
	});

	if (spot.imageBytes) {
		await octokit.rest.repos.createOrUpdateFileContents({
			owner,
			repo,
			path: `public/images/${uuid}.jpg`,
			message: `Add image for spot: ${spot.title}`,
			content: Buffer.from(spot.imageBytes).toString("base64"),
			branch: branchName,
		});
	}

	const prBody = `## 投稿情報

- シリーズ: ${spot.series.name}
- 施設名: ${spot.title}
- 座標: ${spot.lat}, ${spot.lng}
- 投稿者: ${spot.discordUsername} (${spot.discordUserId})
- 投稿日時: ${new Date().toISOString()}

## 説明

${spot.description ?? "(説明なし)"}`;

	const { data: pr } = await octokit.rest.pulls.create({
		owner,
		repo,
		title: `[${spot.series.name}] ${spot.title}`,
		body: prBody,
		head: branchName,
		base: "main",
	});

	return pr.html_url;
}
