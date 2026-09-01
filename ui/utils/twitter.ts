declare global {
	interface Window {
		twttr?: { widgets: { load: () => void } };
	}
}

export function loadTwitterWidgets(): void {
	if (globalThis.window.twttr) {
		globalThis.window.twttr.widgets.load();
		return;
	}

	const script = document.createElement("script");
	script.src = "https://platform.x.com/widgets.js";
	script.async = true;
	document.body.appendChild(script);
}
