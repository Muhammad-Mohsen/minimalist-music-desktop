// wraps navigator.mediaSession
// https://developer.mozilla.org/en-US/docs/Web/API/MediaSession
// https://web.dev/media-session/
var Session = (() => {
	const TARGET = EventBus.target.SESSION;

	EventBus.subscribe((event) => {
		if (event.target == TARGET) return;

		when(event.type)
			.is(EventBus.type.METADATA_UPDATE, () => update(event.data))
			.is(EventBus.type.PLAY, () => setState('playing'))
			.is(EventBus.type.PAUSE, () => setState('paused'));
	});

	async function update(metadata) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: metadata.title,
			artist: metadata.artist || '',
			album: metadata.album,
			artwork: [{
				src: metadata.images?.length
					? `data:${metadata.images[0].mimeType};base64,${metadata.images[0].data.toBase64()}`
					: images.LOGO
			}]
		});
	}

	function setState(state) {
		navigator.mediaSession.playbackState = state;
	}

	const actions = [
		['play', () => EventBus.dispatch({ type: EventBus.type.PLAY, target: TARGET })],
		['pause', () => EventBus.dispatch({ type: EventBus.type.PAUSE, target: TARGET })],
		['previoustrack', () => EventBus.dispatch({ type: EventBus.type.PLAY_PREV, target: TARGET })],
		['nexttrack', () => EventBus.dispatch({ type: EventBus.type.PLAY_NEXT, target: TARGET })],

		['seekbackward', (details) => { /* ... */ }],
		['seekforward', (details) => { /* ... */ }],
		['seekto', (details) => { /* ... */ }],

		['stop', () => { /* ... */ }],
	];

	for (const [action, handler] of actions) {
		try { navigator.mediaSession.setActionHandler(action, handler); }
		catch (error) { console.log(`The media session action "${action}" is not supported yet.`); }
	}

})();
