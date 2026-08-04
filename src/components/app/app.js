// I'm between two minds on this...should I use an App class or should I just use globals?
// globals have the benefit of having a main.js on the root
class App extends HTMLElementBase {
	TARGET = EventBus.target.MAIN;

	accordionAnimation = null;
	height = {
		COLLAPSED: 220, // value needs to be changed in neutralino.config.json as well
		EXPANDED: 725,
	}

	// not sure why, but using the constructor here gives "NotSupportedError: The result must not have attributes"
	connectedCallback() {
		this.render();

		this.disableContextMenu();
		this.enableShortcuts();
		Native.Window.setDraggableRegion('draggable-region');

		State.restore().then(() => EventBus.dispatch({ target: this.TARGET, type: EventBus.type.RESTORE_STATE }));
	}

	close() {
		Native.Window.close();
	}
	minimize() {
		Native.Window.minimize();
	}
	resize(target) {
		const from = window.outerHeight;
		const to = target == 'expand' ? this.height.EXPANDED : this.height.COLLAPSED;

		// animation
		clearInterval(this.accordionAnimation); // clear the previous animation (if any)
		this.accordionAnimation = easeIO(from, to, 300, (val) => Native.Window.height(Math.floor(val)));

		State.set(State.key.EXPANDED, target == 'expand');
	}

	disableContextMenu() {
		document.addEventListener('contextmenu', event => event.preventDefault());
	}
	enableShortcuts() {
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
				.is('Space', () => EventBus.dispatch({ type: EventBus.type.PLAY_PAUSE, target: TARGET }))
				.is('Numpad0', () => EventBus.dispatch({ type: EventBus.type.FROM_THE_TOP, target: TARGET }))
				.is('ArrowLeft', () => {
					if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.PLAY_PREV, target: TARGET })
					else EventBus.dispatch({ type: EventBus.type.RW, target: TARGET })
				})
				.is('ArrowRight', () => {
					if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.PLAY_NEXT, target: TARGET })
					else EventBus.dispatch({ type: EventBus.type.FF, target: TARGET })
				})
				.is('NumpadAdd', () => EventBus.dispatch({ type: EventBus.type.VOLUME_UP, target: TARGET }))
				.is('NumpadSubtract', () => EventBus.dispatch({ type: EventBus.type.VOLUME_DOWN, target: TARGET }))
				.is('KeyF', () => {
					if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.SEARCH, target: TARGET });
				})
				.is('F5', () => EventBus.dispatch({ type: EventBus.type.METADATA_CLEAR, target: TARGET }));
		}
	}

	render() {
		super.render(`
			<window-controls>
				<button class="icon i-minimize" onclick="${this}.minimize()"></button>
				<button class="icon i-close" onclick="${this}.close()"></button>
			</window-controls>

			<music-player id="player"></music-player>
			<button class="icon i-expand expand" onclick="${this}.resize('expand')"></button>
			<music-explorer id="explorer"></music-explorer>
		`);
	}
}

customElements.define('music-app', App);
