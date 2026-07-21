export function getEnv(env: Record<string, string>, name: string): string {
	const value = env[name];
	if (!value) throw new Error(`${name} is not set`);
	return value;
}
