import { Image, XIcon } from "lucide-solid";
import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import "./Card.css";
import type { FeatureView } from "../../src/schema.ts";

interface Props {
	feature: FeatureView;
	onClose: () => void;
}

const Card = (props: Props) => {
	const [imageModalOpen, setImageModalOpen] = createSignal(false);
	let panelRef: HTMLElement | undefined;

	const handleOutsideClick = (e: MouseEvent) => {
		if (panelRef && !panelRef.contains(e.target as Node)) {
			props.onClose();
		}
	};

	onMount(() => {
		const timerId = setTimeout(() => {
			document.addEventListener("click", handleOutsideClick);
		}, 0);
		onCleanup(() => clearTimeout(timerId));
	});

	onCleanup(() => {
		document.removeEventListener("click", handleOutsideClick);
	});

	return (
		<article class="card-panel" ref={panelRef}>
			<div class="card-header">
				<strong>{props.feature.properties.series.name}</strong>
				<Show when={props.feature.properties.image?.length}>
					<button
						type="button"
						class="square-button"
						onClick={() => setImageModalOpen(true)}
					>
						<Image />
					</button>
				</Show>
			</div>
			<div class="card-body">
				<h4>{props.feature.properties.title}</h4>
			</div>
			<Show when={props.feature.properties.description}>
				<p>{props.feature.properties.description}</p>
			</Show>
			<dialog open={imageModalOpen()}>
				<article class="image-modal-panel">
					<header>
						<button
							type="button"
							aria-label="閉じる"
							onClick={() => setImageModalOpen(false)}
						>
							<XIcon />
						</button>
					</header>
					<For each={props.feature.properties.image}>
						{(src) => (
							<img
								src={src}
								alt={props.feature.properties.title}
								class="card-image"
							/>
						)}
					</For>
				</article>
			</dialog>
		</article>
	);
};

export default Card;
