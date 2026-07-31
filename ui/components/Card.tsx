import { X } from "lucide-solid";
import { Show } from "solid-js";
import type { FeatureView } from "../../src/schema.ts";

interface Props {
	feature: FeatureView;
	onClose: () => void;
}

const Card = (props: Props) => {
	return (
		<article>
			<button type="button" onClick={props.onClose} aria-label="閉じる">
				<X />
			</button>
			<h3>{props.feature.properties.series.name}</h3>
			<h2>{props.feature.properties.title}</h2>
			<Show when={props.feature.properties.image}>
				<img
					src={props.feature.properties.image}
					alt={props.feature.properties.title}
				/>
			</Show>
		</article>
	);
};

export default Card;
