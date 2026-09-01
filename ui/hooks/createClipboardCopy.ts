import { createSignal } from "solid-js";

export function createClipboardCopy(feedbackDurationMs = 2000) {
	const [copied, setCopied] = createSignal(false);

	const copy = async (text: string) => {
		await navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), feedbackDurationMs);
	};

	return { copied, copy };
}
