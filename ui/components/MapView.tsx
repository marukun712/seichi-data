import type { FeatureView } from "../../src/schema.ts";
import { createMapLibre } from "../hooks/createMapLibre.ts";
import "./MapView.css";

interface Props {
	features: FeatureView[];
	selected: FeatureView | null;
	seriesColor: string | null;
	onFeatureClick: (feature: FeatureView) => void;
}

const MapView = (props: Props) => {
	const { setContainer } = createMapLibre({
		features: () => props.features,
		selected: () => props.selected,
		seriesColor: () => props.seriesColor,
		onFeatureClick: props.onFeatureClick,
	});

	return <div ref={setContainer} class="map-view" />;
};

export default MapView;
