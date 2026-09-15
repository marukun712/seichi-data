import { Image, X, XIcon } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import "./Card.css";
import type { FeatureView } from "../../src/schema.ts";

interface Props {
	feature: FeatureView;
	onClose: () => void;
}

const Card = (props: Props) => {
	const [imageModalOpen, setImageModalOpen] = createSignal(false);

	return (
		<article class="card-panel">
			<button type="button" onClick={props.onClose} aria-label="閉じる">
				<X />
			</button>
			<h4>{props.feature.properties.series.name}</h4>
			<h3>{props.feature.properties.title}</h3>
			<Show when={props.feature.properties.image?.length}>
				<button type="button" onClick={() => setImageModalOpen(true)}>
					<Image />
					画像を見る
				</button>
			</Show>
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
