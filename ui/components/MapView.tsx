import type { FeatureView } from "../../src/schema.ts";
import { createMapLibre } from "../hooks/createMapLibre.ts";

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

	return <div ref={setContainer} style={{ position: "fixed", inset: 0 }} />;
};

export default MapView;
