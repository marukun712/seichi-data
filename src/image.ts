// https://raw.githubusercontent.com/matmen/ImageScript/master/ImageScript.js
import { Image } from "imagescript";

export async function processImage(url: string): Promise<Uint8Array> {
	const response = await fetch(url);
	const bytes = new Uint8Array(await response.arrayBuffer());
	const image = await Image.decode(bytes);

	if (image.height > 720) {
		image.resize(Image.RESIZE_AUTO, 720);
	}

	return image.encodeJPEG(80);
}
