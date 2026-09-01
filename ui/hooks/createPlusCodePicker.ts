import * as maplibregl from "maplibre-gl";
import { encode } from "pluscodes";
import { createSignal, onMount } from "solid-js";

const MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export function createPlusCodePicker() {
	const [plusCode, setPlusCode] = createSignal<string | null>(null);

	let map: maplibregl.Map | undefined;
	let marker: maplibregl.Marker | undefined;

	let container: HTMLDivElement | undefined;
	const setContainer = (el: HTMLDivElement) => {
		container = el;
	};

	onMount(() => {
		if (!container) return;
		maplibregl.setWorkerUrl(
			"https://esm.sh/maplibre-gl@6.0.0/dist/maplibre-gl-worker.mjs",
		);
		map = new maplibregl.Map({
			container,
			style: MAP_STYLE,
			center: [137.5, 36.5],
			zoom: 5,
		});
		map.on("click", (e) => {
			const { lat, lng } = e.lngLat;
			const code = encode({ latitude: lat, longitude: lng }, 10);
			if (!code) return;
			setPlusCode(code);

			marker?.remove();
			marker = new maplibregl.Marker()
				.setLngLat([lng, lat])
				.addTo(map as maplibregl.Map);
		});
	});

	const flyTo = (lat: number, lon: number) => {
		map?.flyTo({ center: [lon, lat], zoom: 15 });
	};

	return { plusCode, setContainer, flyTo };
}
