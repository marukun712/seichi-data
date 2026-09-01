import { X } from "lucide-solid";
import { Show } from "solid-js";
import type { FeatureView } from "../../src/schema.ts";

interface Props {
	feature: FeatureView;
	onClose: () => void;
}

const Card = (props: Props) => {
	return (
		<article
			style={{
				position: "fixed",
				top: "16px",
				right: "16px",
				"z-index": 1,
			}}
		>
			<button type="button" onClick={props.onClose} aria-label="閉じる">
				<X />
			</button>
			<h4>{props.feature.properties.series.name}</h4>
			<h3>{props.feature.properties.title}</h3>
			<Show when={props.feature.properties.image}>
				<img
					src={props.feature.properties.image}
					alt={props.feature.properties.title}
				/>
			</Show>
			<Show when={props.feature.properties.description}>
				<p>{props.feature.properties.description}</p>
			</Show>
		</article>
	);
};

export default Card;
