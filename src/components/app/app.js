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

		State.restore().then(async () => {
			if (State.get(State.key.ROOT_DIR))
				try { await Native.FS.mountRootDir(State.get(State.key.ROOT_DIR)); }
				catch {} // already mounted

			EventBus.dispatch({ target: this.TARGET, type: EventBus.type.RESTORE_STATE })
		});
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
		this.accordionAnimation = easeIO(from, to, 300, (val) => Native.Window.setHeight(Math.floor(val)));

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
				.is('Space', () => EventBus.dispatch({ type: EventBus.type.PLAY_PAUSE, target: this.TARGET }))
				.is('Numpad0', () => EventBus.dispatch({ type: EventBus.type.FROM_THE_TOP, target: this.TARGET }))
				.is('ArrowLeft', () => {
					if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.PLAY_PREV, target: this.TARGET })
					else EventBus.dispatch({ type: EventBus.type.RW, target: this.TARGET })
				})
				.is('ArrowRight', () => {
					if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.PLAY_NEXT, target: this.TARGET })
					else EventBus.dispatch({ type: EventBus.type.FF, target: this.TARGET })
				})
				.is('NumpadAdd', () => EventBus.dispatch({ type: EventBus.type.VOLUME_UP, target: this.TARGET }))
				.is('NumpadSubtract', () => EventBus.dispatch({ type: EventBus.type.VOLUME_DOWN, target: this.TARGET }))
				.is('KeyF', () => {
					if (event.ctrlKey) EventBus.dispatch({ type: EventBus.type.SEARCH, target: this.TARGET });
				})
		}
	}

	render() {
		super.render(`
			<window-controls>
				<button class="icon i-minimize" onclick="${this}.minimize()"></button>
				<button class="icon i-close" onclick="${this}.close()"></button>
			</window-controls>

			<music-player></music-player>
			<button class="icon i-expand expand" onclick="${this}.resize('expand')"></button>
			<music-explorer></music-explorer>
		`);
	}
}

customElements.define('music-app', App);
