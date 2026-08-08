class Player extends HTMLElementBase {
	TARGET = EventBus.target.PLAYER;
	SEEK_JUMP = 10; // in seconds
	VOLUME_JUMP = .1;

	audio = new Audio();
	playlist = Playlist();
	// metadataWorker = new Worker('metadata/metadata-worker.js');

	lastProgressBarUpdate; // to throttle native calls

	constructor() {
		super();
		this.render();

		EventBus.subscribe((event) => this.#handle(event));

		this.audio.onended = () => {
			this.playNext(true);
		}
		this.audio.onloadeddata = () => {
			this.playPause(this.audio.autoplay);
			this.extractMetadata(this.audio.src);
		}
		this.audio.ontimeupdate = () => {
			if (!this.seek.hasAttribute('seeking')) this.setSeek(this.audio.currentTime);
		}

		this.explorer = this.parentElement.querySelector('music-explorer');

		Native.Taskbar.setThumbnail(images.LOGO);
		Native.Taskbar.setThumbButtons([
			{ id: 101, tooltip: 'Previous', icon: images.PREVIOUS },
			{ id: 102, tooltip: 'Play', icon: images.PLAY },
			{ id: 103, tooltip: 'Next', icon: images.NEXT }
		],
		(event) => {
			const buttonId = event.detail.id;
			if (buttonId == 101) this.playPrev();
			if (buttonId == 102) this.playPause();
			if (buttonId == 103) this.playNext();
		});
	}

	async #handle(event) {
		if (event.target == this.TARGET) return;

		when(event.type)
			.is(EventBus.type.RESTORE_STATE, async () => {
				const path = State.get(State.key.TRACK);
				const currentTime = parseInt(State.get(State.key.SEEK)) || 0;
				const duration = parseInt(State.get(State.key.DURATION)) || 100;

				this.load(path);
				this.playlist.set(await this.explorer.listFiles('audio'));
				this.audio.currentTime = currentTime;
				this.setSeek(currentTime, duration);

				this.onVolumeChange(parseFloat(State.get(State.key.VOLUME)));
				this.shuffle(State.get(State.key.SHUFFLE));
				this.repeat(State.get(State.key.REPEAT));

				// loadeddata event, apparently, doesn't fire until the audio needs to be played! So if autoplay is false, it won't fire
				// this.metadataWorker.postMessage(this.explorer.path2src(path));
			})
			.is(EventBus.type.PLAY_TRACK, async () => {
				const path = State.get(State.key.TRACK);

				this.load(path, 'autoplay');
				this.playlist.set(await this.explorer.listFiles('audio'));
			})

			.is(EventBus.type.PLAY, () => this.playPause(true, 'suppress'))
			.is(EventBus.type.PAUSE, () => this.playPause(false, 'suppress'))
			.is(EventBus.type.PLAY_NEXT, () => this.playNext(false))
			.is(EventBus.type.PLAY_PREV, () => this.playPrev())
			.is(EventBus.type.FROM_THE_TOP, () => { this.audio.currentTime = 0; this.setSeek(0); })
			.is(EventBus.type.PLAY_PAUSE, () => this.playPause())
			.is(EventBus.type.FF, () => this.ff())
			.is(EventBus.type.RW, () => this.rw())

			.is(EventBus.type.VOLUME_DOWN, () => this.onVolumeChange(this.audio.volume - this.VOLUME_JUMP))
			.is(EventBus.type.VOLUME_UP, () => this.onVolumeChange(this.audio.volume + this.VOLUME_JUMP))

			.is(EventBus.type.METADATA_CLEAR, () => {}) // this.metadataWorker.postMessage({ type: EventBus.type.METADATA_CLEAR, src: this.audio.src }))
	}

	async load(path, autoplay) {
		if (!this.initialized()) return this.setAlbumArtist(State.get(State.key.ALBUM)); // show quote

		this.loadingIndicator(true);
		const src = this.explorer.path2src(path);

		this.audio.pause();
		this.setSeek(0);
		this.audio.src = src;
		this.audio.autoplay = !!autoplay;
		this.setTitle(); // immediately show title (while waiting for the metadata)
	}

	// PLAYBACK CONTROLS
	playPause(force, suppress) {
		if (!this.initialized()) return;

		force != undefined
			? (force ? this.audio.play() : this.audio.pause())
			: (this.audio.paused ? this.audio.play() : this.audio.pause());

		this.playPauseButton.classList.toggle('pause', !this.audio.paused);
		this.setProgressBar('force');

		Native.Taskbar.setThumbButtons([
			{ id: 101, tooltip: 'Previous', icon: images.PREVIOUS },
			{ id: 102, tooltip: this.audio.paused ? 'Play' : 'Pause', icon: this.audio.paused ? images.PLAY : images.PAUSE },
			{ id: 103, tooltip: 'Next', icon: images.NEXT }
		]);

		if (!suppress) EventBus.dispatch({ type: force ? EventBus.type.PLAY : EventBus.type.PAUSE, target: this.TARGET });
	}
	playNext(onComplete) {
		if (!this.initialized()) return;

		const path = this.playlist.getNext(onComplete);
		if (!path) return;

		State.set(State.key.TRACK, path);
		this.load(path, 'autoplay');
		EventBus.dispatch({ type: EventBus.type.PLAY_TRACK, target: this.TARGET });
	}
	playPrev() {
		if (!this.initialized()) return;

		const path = this.playlist.getPrev();
		if (!path) return;

		State.set(State.key.TRACK, path);
		this.load(path, 'autoplay');
		EventBus.dispatch({ type: EventBus.type.PLAY_TRACK, target: this.TARGET });
	}
	ff() {
		this.audio.currentTime += this.SEEK_JUMP
		this.setSeek(this.audio.currentTime);
	}
	rw() {
		this.audio.currentTime -= this.SEEK_JUMP
		this.setSeek(this.audio.currentTime);
	}
	shuffle(force) {
		const current = this.playlist.toggleShuffle(force, force != undefined);
		this.shuffleIcon.className = `icon i-shuffle${current ? '-on' : ''}`;
	}
	repeat(force) {
		const current = this.playlist.toggleRepeat(force, force != undefined);
		this.repeatIcon.className = 'icon i-repeat' + when(current)
			.is(0, () => '')
			.is(1, () => '-on')
			.is(2, () => '-once')
			.val();
	}

	// VOLUME
	onVolumeChange(restoredVal) {
		const val = isNaN(restoredVal) ? this.volumeLevel.value : restoredVal;

		if (restoredVal != undefined) this.volumeLevel.value = val; // update the vol if restored
		else State.set(State.key.VOLUME, val); // update the state otherwise

		this.audio.volume = val;
		if (val) this.audio.muted = false;
	}
	toggleMute() {
		this.audio.muted = !this.audio.muted;
		this.volumeIcon.className = `icon i-speaker-${this.audio.muted ? 'mute' : 'high'}`;
	}

	// SEEK
	setSeek(position, duration) {
		if (!this.initialized()) return;

		if (duration) {
			this.seek.max = duration;
			this.duration.innerHTML = this.readableTime(duration);
			State.set(State.key.DURATION, duration);
		}

		this.currentPosition.innerHTML = this.readableTime(position);
		this.seek.value = position;
		State.set(State.key.SEEK, position);

		this.setProgressBar();
	}
	onSeekMouseDown() {
		this.seek.setAttribute('seeking', true);
		this.audio.muted = true; // mute the thing while seeking so that it doesn't squeak
	}
	onSeekChange() { // user-initiated event
		if (!this.initialized()) return;

		const value = this.seek.value;
		this.setSeek(value);
	}
	onSeekMouseUp() {
		this.audio.currentTime = this.seek.value;
		this.seek.removeAttribute('seeking');
		this.audio.muted = false;
	}

	// METADATA
	extractMetadata(src) {
		const input = new MediaBunny.Input({
			source: new MediaBunny.UrlSource(src),
			formats: MediaBunny.ALL_FORMATS,
		});

		input.getMetadataTags().then((tags) => {
			this.setAlbumArtist(tags.album, tags.artist);
			this.setSeek(this.audio.currentTime || 0, tags.duration || this.audio.duration);
			this.setArtwork(tags.images);

			EventBus.dispatch({ target: this.TARGET, type: EventBus.type.METADATA_UPDATE, data: tags });
			this.loadingIndicator(false);
		});
	}

	// UI STUFF
	setTitle(title) {
		this.trackTitle.innerHTML = title || Native.FS.readablePath(State.get(State.key.TRACK));
		this.trackTitle.setAttribute('title', this.trackTitle.textContent);
		Native.Window.setTitle(this.trackTitle.textContent);
	}
	setAlbumArtist(album, artist) {
		album = album || Native.FS.readablePath(State.get(State.key.CURRENT_DIR)); // default to current dir for no-album-in-metadata case

		this.albumArtist.innerHTML = `<strong>${album}</strong> ${artist ? '| ' + artist : ''}`;
		this.albumArtist.setAttribute('title', this.albumArtist.textContent);
	}
	setArtwork(images) {
		if (images?.length) {
			const src = `data:${images[0].mimeType};base64,${images[0].data.toBase64()}`;
			this.artwork.setAttribute('src', src);
			Native.Taskbar.setThumbnail(src);
		}
		this.artwork.classList.toggle('hidden', !images?.length);
	}
	setProgressBar(force) {
		// must take absolute value because the seek value can arbitrarily change (for example, manual seeking or when changing tracks)
		if (!force && Math.abs(this.seek.value - this.lastProgressBarUpdate) < 1) return;
		Native.Taskbar.setProgress(this.audio.paused ? 'paused' : 'normal', this.seek.value, this.seek.max);
		this.lastProgressBarUpdate = this.seek.value;
	}
	readableTime(seconds) {
		const ss = parseInt(seconds % 60).toString().padStart(2, '0');
		const mm = parseInt((seconds / 60) % 60).toString().padStart(2, '0');
		const hh = parseInt((seconds / 60 / 60)).toString().padStart(2, '0');

		const hhMax = parseInt((this.seek.max / 60 / 60)).toString().padStart(2, '0');

		return hhMax == '00' ? `${mm}:${ss}` : `${hh}:${mm}:${ss}`;
	}
	loadingIndicator(force) {
		this.albumArtist.classList.toggle('blur', force);
		this.duration.classList.toggle('blur', force);
		if (force) this.artwork.classList.add('hidden');
	}

	initialized() { return State.get(State.key.TRACK) != 'null'; }

	render() {
		super.render(`
			<!-- ARTWORK -->
			<img id="artwork" alt="Artwork">

			<!-- TRACK INFO -->
			<track-info id="draggable-region">
				<label id="track-title">Minimalist Music</label>
				<label id="album-artist">Hello...</label>
			</track-info>

			<!-- default max set to 9999 so that we don't get division by 0 errors when the file starts playing but the metadata didn't yet load -->
			<input type="range" id="seek" step=".01" max="9999" onmousedown="${this}.onSeekMouseDown()" oninput="${this}.onSeekChange()" onmouseup="${this}.onSeekMouseUp()">

			<!-- CONTROLS -->
			<controls>
				<div class="volume-container">
					<button id="volume-icon" class="icon i-speaker-high" onclick="${this}.toggleMute()"></button>
					<input type="range" max="1" step="0.05" id="volume-level" class="volume-slider" oninput="${this}.onVolumeChange()">
				</div>
				<button id="repeat-icon" class="icon i-repeat" onclick="${this}.repeat()"></button>

				<button class="icon i-skip-back" onclick="${this}.playPrev()"></button>
				<button id="play-pause-button" class="icon fab color-secondary" onclick="${this}.playPause()"></button>
				<button class="icon i-skip-forward" onclick="${this}.playNext()"></button>

				<button id="shuffle-icon" class="icon i-shuffle" onclick="${this}.shuffle()"></button>

				<div class="row seek-text-container" inert>
					<label id="current-position">--:--</label>
					<label id="duration">--:--</label>
				</div>
			</controls>
		`);
	}
}

window.customElements.define('music-player', Player);
