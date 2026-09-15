export type Bindings = {
	DISCORD_APPLICATION_ID: string;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_TOKEN: string;
	DISCORD_GUILD_ID: string;
	GITHUB_APP_ID: string;
	GITHUB_APP_PRIVATE_KEY: string;
	GITHUB_INSTALLATION_ID: string;
	GITHUB_REPO_OWNER: string;
	GITHUB_REPO_NAME: string;
};

export type Variables = {
	series?: string;
	title?: string;
	pluscode?: string;
	description?: string;
	tags?: string;
	image?: string;
};

export type Env = { Bindings: Bindings; Variables: Variables };
