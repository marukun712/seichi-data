import { X, XIcon } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import type { FeatureView } from "../../src/schema.ts";

interface Props {
	feature: FeatureView;
	onClose: () => void;
}

const Card = (props: Props) => {
	const [imageModalOpen, setImageModalOpen] = createSignal(false);

	return (
		<article
			style={{
				position: "fixed",
				top: "16px",
				right: "16px",
				width: "32vw",
				"z-index": 1,
			}}
		>
			<button type="button" onClick={props.onClose} aria-label="閉じる">
				<X />
			</button>
			<h4>{props.feature.properties.series.name}</h4>
			<h3>{props.feature.properties.title}</h3>
			<Show when={props.feature.properties.image?.length}>
				<button type="button" onClick={() => setImageModalOpen(true)}>
					画像を見る
				</button>
			</Show>
			<Show when={props.feature.properties.description}>
				<p>{props.feature.properties.description}</p>
			</Show>
			<dialog open={imageModalOpen()}>
				<article>
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
								style={{ padding: "24px" }}
							/>
						)}
					</For>
				</article>
			</dialog>
		</article>
	);
};

export default Card;
