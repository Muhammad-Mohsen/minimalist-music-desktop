var EventBus = (() => {

	/** The event `type` */
	const type = {
		DIR_CHANGE: 'dirchange',
		RESTORE_STATE: 'restorestate',

		PLAY_TRACK: 'playtrack',
		PLAY_NEXT: 'playnext',
		PLAY_PREV: 'playprev',
		PLAY: 'play',
		PAUSE: 'pause',
		SEEK_UPDATE: 'seekupdate',
		VOLUME: 'volume',
		VOLUME_DOWN: 'volumedown',
		VOLUME_UP: 'volumeup',
		METADATA_UPDATE: 'metadataupdate',
		METADATA_FETCH: 'metadatafetch',
		METADATA_CLEAR: 'metadataclear',

		TOGGLE_SHUFFLE: 'toggleshuffle',
		TOGGLE_REPEAT: 'togglerepeat',

		FF: 'ff',
		RW: 'rw',
		PLAY_PAUSE: 'playpause',
		FROM_THE_TOP: 'fromthetop',

		SEARCH: 'search',

		PLAY_SELECTED: 'playselected', // play the selected items (from breadcrumb bar)
		SELECT_MODE_ADD: 'selectmodeadd', // add a track to the selected list (activate the mode if none were selected before)
		SELECT_MODE_SUB: 'selectmodesub', // remove a track from the selected list (deactivate the mode if none are selected now)
		SELECT_MODE_INACTIVE: 'selectmodeinactive', // deactivate select mode (press cancel from the breadcrumb bar)
	}

	/** The event `target` (read: source) */
	const target = {
		EXPLORER: 0,
		BREADCRUMB_BAR: 1,
		PLAYER: 2, // ??
		MAIN: 3,
		SESSION: 4,
		UI: 5,
		KEYBOARD: 6
	}

	const subscribers = []; // a regular ol' array will do

	/**
	 * Subscribe to the event bus. Subscribes to _ALL_ event types
	 * @param {(event) => void} sub - A callback function that takes the event as an arg.
	 */
	function subscribe(sub) {
		subscribers.push(sub);
	}
	function unsubscribe(sub) {
		subscribers = subscribers.filter(s => s != sub);
	}

	/**
	 * Dispatch an event to subscribers.
	 * @param {{ type: EventBus.type, target: EventBus.target, data?: any }} event - The event object.
	 */
	function dispatch(event) {
		subscribers.forEach(callback => callback(event));
	}

	return {
		type,
		target,

		subscribe,
		unsubscribe,

		dispatch
	}

})();
