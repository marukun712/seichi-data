import { PhotonImage } from "@cf-wasm/photon/workerd";

const JPEG_QUALITY = 80;

export async function fetchImage(url: string): Promise<Uint8Array> {
	const res = await fetch(url);
	const bytes = new Uint8Array(await res.arrayBuffer());
	return convertToJpeg(bytes);
}

function convertToJpeg(bytes: Uint8Array): Uint8Array {
	const inputImage = PhotonImage.new_from_byteslice(bytes);
	const outputBytes = inputImage.get_bytes_jpeg(JPEG_QUALITY);
	inputImage.free();
	return outputBytes;
}
