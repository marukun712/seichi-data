export function getEnv(name: string): string {
	const value = Deno.env.get(name);
	if (!value) throw new Error(`${name} is not set`);
	return value;
}
