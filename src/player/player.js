var MetadataWorker = new Worker('metadata/metadata.js');

var Player = (() => {

	const SELF = EventBus.target.PLAYER;
	const SEEK_JUMP = 10; // in seconds
	const VOLUME_JUMP = .1;
	const SEEKING_ATTR = 'seeking';

	let lastProgressBarUpdate; // to throttle native calls

	const ui = {
		title: document.querySelector('#title'),
		albumArtist: document.querySelector('#album-artist'),
		artwork: document.querySelector('#artwork'),
		seek: document.querySelector('#seek'),
		position: document.querySelector('#current-position'),
		duration: document.querySelector('#duration'),
		volume: document.querySelector('#volume-level'),
		volumeIcon: document.querySelector('#volume-icon'),
		shuffle: document.querySelector('#shuffle-icon'),
		repeat: document.querySelector('#repeat-icon'),
		playPause: document.querySelector('#play-pause'),
	};

	const audio = new Audio();

	// EVENT HANDLERS
	EventBus.subscribe(async(event) => {
		if (event.target == SELF) return;

		when(event.type)
			.is(EventBus.type.PLAY_TRACK, async () => {
				const path = State.get(State.key.TRACK);

				load(path, 'autoplay');
				Playlist.set(await Explorer.listTracks());
			})
			.is(EventBus.type.RESTORE_STATE, async () => {
				const path = State.get(State.key.TRACK);
				const currentTime = parseInt(State.get(State.key.SEEK)) || 0;
				const duration = parseInt(State.get(State.key.DURATION)) || 100;

				load(path);
				Playlist.set(await Explorer.listTracks());
				audio.currentTime = currentTime;
				seek(currentTime, duration);

				onVolumeChange(parseFloat(State.get(State.key.VOLUME)));
				shuffle(State.get(State.key.SHUFFLE));
				repeat(State.get(State.key.REPEAT));

				// loadeddata event, apparently, doesn't fire until the audio needs to be played! So if autoplay is false, it won't fire
				MetadataWorker.postMessage(Native.FS.pathToSrc(path));
			})
			.is(EventBus.type.PLAY, () => playPause(true, 'suppress'))
			.is(EventBus.type.PAUSE, () => playPause(false, 'suppress'))
			.is(EventBus.type.PLAY_NEXT, () => playNext(false))
			.is(EventBus.type.PLAY_PREV, () => playPrev())
			.is(EventBus.type.FROM_THE_TOP, () => { audio.currentTime = 0; seek(0); })
			.is(EventBus.type.PLAY_PAUSE, () => playPause())
			.is(EventBus.type.FF, () => ff())
			.is(EventBus.type.RW, () => rw())

			.is(EventBus.type.VOLUME_DOWN, () => onVolumeChange(audio.volume - VOLUME_JUMP))
			.is(EventBus.type.VOLUME_UP, () => onVolumeChange(audio.volume + VOLUME_JUMP))

			.is(EventBus.type.METADATA_CLEAR, () => MetadataWorker.postMessage({ type: EventBus.type.METADATA_CLEAR, src: audio.src }))
	});

	MetadataWorker.addEventListener('message', (event) => {
		const metadata = JSON.parse(event.data);
		albumArtist(metadata.album, metadata.artist);
		artwork(metadata.artwork);
		seek(audio.currentTime || 0, metadata.duration || audio.duration); // the metadata library reported NaN for absolution.m4b!

		EventBus.dispatch({
			target: EventBus.target.PLAYER,
			type: EventBus.type.METADATA_UPDATE,
			data: metadata
		});

		loadingIndicator(false);
	});

	audio.onended = function () {
		playNext(true);
	}
	audio.onloadeddata = function () {
		playPause(audio.autoplay);
		MetadataWorker.postMessage({ type: EventBus.type.METADATA_FETCH, src: audio.src }); // fetch metadata after audio is loaded so as not to trip over each other
	}
	audio.ontimeupdate = function () {
		if (!ui.seek.hasAttribute(SEEKING_ATTR)) seek(audio.currentTime);
	}

	function load(path, autoplay) {
		if (!initialized()) return albumArtist(State.get(State.key.ALBUM)); // show quote

		loadingIndicator(true);
		const src = Native.FS.pathToSrc(path);

		audio.pause();
		seek(0);
		audio.src = src;
		audio.autoplay = !!autoplay;
		title(); // immediately show title (while waiting for the metadata)
	}

	// PLAYBACK CONTROLS
	function playPause(force, suppress) {
		if (!initialized()) return;

		force != undefined
			? (force ? audio.play() : audio.pause())
			: (audio.paused ? audio.play() : audio.pause());

		ui.playPause.classList.toggle('pause', !audio.paused);
		progressBar('force');

		if (!suppress) EventBus.dispatch({ type: force ? EventBus.type.PLAY : EventBus.type.PAUSE, target: SELF });
	}
	function playNext(onComplete) {
		if (!initialized()) return;

		const path = Playlist.getNext(onComplete);
		if (!path) return;

		State.set(State.key.TRACK, path);
		load(path, 'autoplay');
		EventBus.dispatch({ type: EventBus.type.PLAY_TRACK, target: SELF });
	}
	function playPrev() {
		if (!initialized()) return;

		const path = Playlist.getPrev();
		if (!path) return;

		State.set(State.key.TRACK, path);
		load(path, 'autoplay');
		EventBus.dispatch({ type: EventBus.type.PLAY_TRACK, target: SELF });
	}
	function ff() {
		audio.currentTime += SEEK_JUMP
		seek(audio.currentTime);
	}
	function rw() {
		audio.currentTime -= SEEK_JUMP
		seek(audio.currentTime);
	}
	function shuffle(force) {
		const current = Playlist.toggleShuffle(force, force != undefined);
		ui.shuffle.innerHTML = current ? 'shuffle_on' : 'shuffle';

	}
	function repeat(force) {
		const current = Playlist.toggleRepeat(force, force != undefined);
		ui.repeat.innerHTML = when(current)
			.is(0, () => 'repeat')
			.is(1, () => 'repeat_on')
			.is(2, () => 'repeat_one_on')
			.val();
	}

	// VOLUME
	function onVolumeChange(restoredVal) {
		const val = (isNaN(restoredVal) || restoredVal == undefined) ? ui.volume.value : restoredVal;

		if (restoredVal != undefined) ui.volume.value = val; // update the vol if restored
		else State.set(State.key.VOLUME, val); // update the state otherwise

		audio.volume = val;
		if (val) audio.muted = false;
	}
	function toggleMute() {
		audio.muted = !audio.muted;
		ui.volumeIcon.innerHTML = audio.muted ? 'volume_off' : 'volume_up';
	}

	// SEEK
	function seek(position, duration) {
		if (!initialized()) return;

		if (duration) {
			ui.seek.max = duration;
			ui.duration.innerHTML = readableTime(duration);
			State.set(State.key.DURATION, duration);
		}

		ui.position.innerHTML = readableTime(position);
		ui.seek.value = position;
		State.set(State.key.SEEK, position);

		progressBar();
	}
	function onSeekMouseDown() {
		ui.seek.setAttribute(SEEKING_ATTR, true);
		audio.muted = true; // mute the thing while seeking so that it doesn't squeak
	}
	function onSeekChange() { // user-initiated event
		if (!initialized()) return;

		const value = ui.seek.value;
		audio.currentTime = value;
		seek(value);
	}
	function onSeekMouseUp() {
		ui.seek.removeAttribute(SEEKING_ATTR);
		audio.muted = false;
	}

	// UI STUFF
	function title(title) {
		ui.title.innerHTML = title || Native.FS.readablePath(State.get(State.key.TRACK));
		ui.title.setAttribute('title', ui.title.textContent);
		Native.Window.title(ui.title.textContent);
	}
	function albumArtist(album, artist) {
		album = album || Native.FS.readablePath(State.get(State.key.CURRENT_DIR)); // default to current dir for no-album-in-metadata case

		ui.albumArtist.innerHTML = `<strong>${album}</strong> ${artist ? '| ' + artist : ''}`;
		ui.albumArtist.setAttribute('title', ui.albumArtist.textContent);
	}
	function artwork(art) {
		if (art) ui.artwork.setAttribute('src', art);
		ui.artwork.classList.toggle('hidden', !art);
	}
	function readableTime(seconds) {
		const ss = parseInt(seconds % 60).toString().padStart(2, '0');
		const mm = parseInt((seconds / 60) % 60).toString().padStart(2, '0');
		const hh = parseInt((seconds / 60 / 60)).toString().padStart(2, '0');

		const hhMax = parseInt((ui.seek.max / 60 / 60)).toString().padStart(2, '0');

		return hhMax == '00' ? `${mm}:${ss}` : `${hh}:${mm}:${ss}`;
	}
	function loadingIndicator(force) {
		ui.albumArtist.classList.toggle('blur', force);
		ui.duration.classList.toggle('blur', force);
		if (force) ui.artwork.classList.add('hidden');
	}
	function progressBar(force) {
		// must take absolute value because the seek value can arbitrarily change (for example, manual seeking or when changing tracks)
		if (!force && Math.abs(ui.seek.value - lastProgressBarUpdate) < 1) return;
		Native.Window.progressBar(audio.paused ? 'paused' : 'normal', ui.seek.value / ui.seek.max * 100);
		lastProgressBarUpdate = ui.seek.value;
	}

	function initialized() { return State.get(State.key.TRACK) != 'null'; }

	return {
		load,
		playPause,
		playNext,
		playPrev,

		seek,
		ff,
		rw,

		shuffle,
		repeat,

		onSeekMouseDown,
		onSeekChange,
		onSeekMouseUp,
		onVolumeChange,
		toggleMute,
	}

})();
