importScripts('music-metadata-browser.js', '../core/fluent-db.js', '../core/event-bus.js', 'metadata-store.js');

const retriever = require_lib4();
const store = new MetadataStore();

onmessage = async (event) => {
	if (event.data.type == EventBus.type.METADATA_FETCH) {
		let metadata = await store.getItem(event.data.src);
		if (metadata) return postMessage(JSON.stringify(metadata));

		metadata = await retriever.fetchFromUrl(event.data.src, { skipPostHeaders: true });
		const art = metadata.common.picture?.[0];

		metadata = {
			src: event.data.src,
			title: metadata.common.title,
			album: metadata.common.album,
			artist: metadata.common.artist,
			duration: metadata.format.duration,
			artwork: art ? `data:${art.format};base64,${art.data.toString('base64')}` : undefined
		}

		store.setItem(metadata);
		postMessage(JSON.stringify(metadata));
	}
	else if (event.data.type == EventBus.type.METADATA_CLEAR) {
		store.removeItem(event.data.src)
	}
}
