// https://github.com/octokit/auth-app.js
import { createAppAuth } from "@octokit/auth-app";
// https://octokit.github.io/rest.js/
import { Octokit } from "octokit";
import { getEnv } from "./env.ts";
import type { SpotData } from "./schema.ts";

function bytesToBase64(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function jsonToBase64(obj: unknown): string {
	const bytes = new TextEncoder().encode(JSON.stringify(obj, null, 2));
	let binary = "";
	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary);
}

function createOctokit(env: Record<string, string>): Octokit {
	return new Octokit({
		authStrategy: createAppAuth,
		auth: {
			appId: getEnv(env, "GITHUB_APP_ID"),
			privateKey: getEnv(env, "GITHUB_APP_PRIVATE_KEY"),
			installationId: getEnv(env, "GITHUB_INSTALLATION_ID"),
		},
	});
}

// https://docs.github.com/en/rest/repos/contents
export async function createSpotPR(
	spot: SpotData,
	env: Record<string, string>,
): Promise<string> {
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
		path: `public/${spot.series}.geojson`,
	});

	if (Array.isArray(existingFile) || !("content" in existingFile)) {
		throw new Error("Unexpected file response");
	}

	const rawContent = existingFile.content.replace(/\n/g, "");
	const contentBytes = Uint8Array.from(atob(rawContent), (c) =>
		c.charCodeAt(0),
	);
	const geojson = JSON.parse(new TextDecoder().decode(contentBytes));

	const newFeature = {
		type: "Feature",
		geometry: {
			type: "Point",
			coordinates: [spot.lng, spot.lat],
		},
		properties: {
			title: spot.title,
			description: spot.description,
			...(spot.episode ? { episode: spot.episode } : {}),
			...(spot.imageBytes ? { image: `images/${uuid}.jpg` } : {}),
		},
	};

	geojson.features.push(newFeature);

	await octokit.rest.repos.createOrUpdateFileContents({
		owner,
		repo,
		path: `public/${spot.series}.geojson`,
		message: `Add spot: ${spot.title}`,
		content: jsonToBase64(geojson),
		sha: existingFile.sha,
		branch: branchName,
	});

	if (spot.imageBytes) {
		await octokit.rest.repos.createOrUpdateFileContents({
			owner,
			repo,
			path: `public/images/${uuid}.jpg`,
			message: `Add image for spot: ${spot.title}`,
			content: bytesToBase64(spot.imageBytes),
			branch: branchName,
		});
	}

	const prBody = `## 投稿情報

- シリーズ: ${spot.seriesName}
- 施設名: ${spot.title}
- エピソード: ${spot.episode ?? "未指定"}
- 座標: ${spot.lat}, ${spot.lng}
- 投稿者: ${spot.discordUsername} (${spot.discordUserId})
- 投稿日時: ${new Date().toISOString()}

## 説明

${spot.description}`;

	const { data: pr } = await octokit.rest.pulls.create({
		owner,
		repo,
		title: `[${spot.series}] ${spot.title}`,
		body: prBody,
		head: branchName,
		base: "main",
	});

	return pr.html_url;
}
