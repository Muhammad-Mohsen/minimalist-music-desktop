var Playlist = (() => {

	const repeat = {
		NO: 0,
		YES: 1,
		YES_ONE: 2,
	}

	// these should be in the state
	let repeatMode = repeat.NO;
	let shuffle = false;

	let index = 0;
	let tracks = [];

	function set(paths) {
		const currentIndex = paths.indexOf(State.get(State.key.TRACK));
		tracks = paths.rotate(currentIndex * -1); // rotate the array to start at the selected track
		index = 0;
	}
	function contains(track) {
		return tracks.includes(track);
	}

	function getNext(onComplete) {
		if (!tracks.length) return;

		if (repeatMode == repeat.YES_ONE) return tracks[index];
		else if (repeatMode == repeat.YES) index = (index + 1) % tracks.length;
		else if (repeatMode == repeat.NO) {
			index = (index + 1) % tracks.length;
			if (index == 0 && onComplete) return;
		}

		if (shuffle) index = Math.floor(Math.random() * tracks.length);

		return tracks[index];
	}
	function getPrev() {
		if (!tracks.length) return;

		if (shuffle) index = Math.floor(Math.random() * tracks.length);
		else if (repeatMode == repeat.YES_ONE) return tracks[index];
		else if (index > 0) index--;
		else index = tracks.length - 1;

		return tracks[index];
	}

	function toggleShuffle(force, noSave) {
		if (force != undefined) shuffle = force == 'true';
		else shuffle = !shuffle;

		if (!noSave) State.set(State.key.SHUFFLE, shuffle);

		return shuffle;
	}
	function toggleRepeat(force, noSave) {
		if (force != undefined) repeatMode = parseInt(force) || 0;
		else repeatMode = (repeatMode + 1) % 3;

		if (!noSave) State.set(State.key.REPEAT, repeatMode);

		return repeatMode;
	}

	return {
		repeat,

		toggleShuffle,
		toggleRepeat,

		set,
		contains,

		getNext,
		getPrev,
	}
});
