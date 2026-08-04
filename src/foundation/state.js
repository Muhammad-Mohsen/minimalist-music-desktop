var State = (() => {

	const key = {
		EXPANDED: 'state-expanded',
		CURRENT_DIR: 'state-current-dir',
		ROOT_DIR: 'state-root-dir',

		PAUSED: 'state-paused',
		SEEK: 'state-seek',
		VOLUME: 'state-volume',
		SHUFFLE: 'state-shuffle',
		REPEAT: 'state-repeat',

		TRACK: 'state-track',
		DURATION: 'state-duration',
		ALBUM: 'state-album',
		ARTIST: 'state-artist'
	}

	let context;

	async function restore() {
		context = document.body;

		const rootDir = localStorage.getItem(key.ROOT_DIR);
		if (rootDir) set(key.ROOT_DIR, rootDir, 'passive');

		const currentDir = localStorage.getItem(key.CURRENT_DIR) || rootDir;
		set(key.CURRENT_DIR, currentDir, 'passive');

		set(key.EXPANDED, false, 'passive');
		set(key.PAUSED, true, 'passive');

		set(key.SEEK, localStorage.getItem(key.SEEK), 'passive');
		set(key.VOLUME, localStorage.getItem(key.VOLUME), 'passive');
		set(key.SHUFFLE, localStorage.getItem(key.SHUFFLE), 'passive');
		set(key.REPEAT, localStorage.getItem(key.REPEAT), 'passive');

		set(key.TRACK, localStorage.getItem(key.TRACK), 'passive');
		set(key.DURATION, localStorage.getItem(key.DURATION), 'passive');
		set(key.ALBUM, localStorage.getItem(key.ALBUM) || quotes[Math.randomInt(0, 99)], 'passive');
		set(key.ARTIST, localStorage.getItem(key.ARTIST), 'passive');
	}

	function set(key, val, passive) {
		context.setAttribute(key, val);
		if (!passive) localStorage.setItem(key, val);
	}

	function get(key) {
		return context.getAttribute(key);
	}

	return {
		key,

		restore,
		set,
		get,
	}

})();
