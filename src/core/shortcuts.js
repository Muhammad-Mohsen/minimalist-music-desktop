(function () {

	const SELF = EventBus.target.KEYBOARD;

	// prevent space from scrolling the explorer
	window.onkeydown = (event) => {
		if (event.target.tagName.toUpperCase() == 'INPUT') return; // ignore key presses in the search box
		event.preventDefault();
	}

	window.onkeyup = (event) => {
		if (event.target.type == 'text') return; // ignore key presses in the search box

		event.preventDefault();
		event.stopPropagation();

		when(event.code)
			.is('Space', () => EventBus.dispatch({ type: EventBus.type.PLAY_PAUSE, target: SELF }))
			.is('Numpad0', () => EventBus.dispatch({ type: EventBus.type.FROM_THE_TOP, target: SELF }))
			.is('ArrowLeft', () => {
				if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.PLAY_PREV, target: SELF })
				else EventBus.dispatch({ type: EventBus.type.RW, target: SELF })
			})
			.is('ArrowRight', () => {
				if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.PLAY_NEXT, target: SELF })
				else EventBus.dispatch({ type: EventBus.type.FF, target: SELF })
			})
			.is('NumpadAdd', () => EventBus.dispatch({ type: EventBus.type.VOLUME_UP, target: SELF }))
			.is('NumpadSubtract', () => EventBus.dispatch({ type: EventBus.type.VOLUME_DOWN, target: SELF }))
			.is('KeyF', () => {
				if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.SEARCH, target: SELF });
			})
			.is('F5', () => EventBus.dispatch({ type: EventBus.type.METADATA_CLEAR, target: SELF }));
	}

})();
