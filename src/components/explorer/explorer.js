class Explorer extends HTMLElementBase {
	TARGET = EventBus.target.EXPLORER;

	cache = new Map();

	constructor() {
		super();
		this.render();
		EventBus.subscribe((event) => this.#handle(event));
	}

	#handle(event) {
		if (event.target == this.TARGET) return;

		when(event.type)
			.is(EventBus.type.RESTORE_STATE, () => this.update())
			.is(EventBus.type.PLAY_TRACK, () => {
				const path = State.get(State.key.TRACK);
				const target = this.explorer.querySelectorAll('button').toArray().find(f => f.getAttribute('path') == path);
				if (target) this.select(target);
			})
			.is(EventBus.type.SEARCH, () => {
				if (State.get(State.key.EXPANDED) == 'true') this.toggleSearchMode(true);
			});
	}

	async update() {
		const files = await this.listFiles();
		const current = State.get(State.key.CURRENT_DIR);
		const forward = current.length > this.getAttribute('current-dir')?.length;

		this.setAttribute('current-dir', current);

		// explorer
		this.explorer.startViewTransition({
			update: () => {
				this.explorer.innerHTML = files.map(file => this.#renderItem(file)).join('');
			},
			types: [forward ? 'forward' : 'back']
		});

		// breadcrumbs
		this.crumbs.innerHTML = '';
		current.split(Native.FS.PATH_SEPARATOR).reduce((acc, curr) => {
			if (!curr) return acc;

			const pathSegment = acc ? acc + Native.FS.PATH_SEPARATOR + curr : curr;
			this.crumbs.insertAdjacentHTML('beforeend', this.#renderCrumb(pathSegment));
			return pathSegment;
		}, '');

		this.crumbs.scrollTo(this.crumbs.scrollWidth, 0);
	}

	onItemClick(target) {
		const path = target.getAttribute('path');

		if (target.className.includes('folder')) {
			this.goto(path);
		}
		else {
			this.select(target);
			State.set(State.key.TRACK, path);
			EventBus.dispatch({ target: this.TARGET, type: EventBus.type.PLAY_TRACK });
		}
	}
	onUpClick() {
		if (this.isAtRoot()) return;

		const current = State.get(State.key.CURRENT_DIR);
		const dir = current.split(Native.FS.PATH_SEPARATOR).slice(0, -1).join(Native.FS.PATH_SEPARATOR);

		State.set(State.key.CURRENT_DIR, dir);
		EventBus.dispatch({ target: this.TARGET, type: EventBus.type.DIR_CHANGE });
		this.update();
	}
	onCrumbClick(target) {
		const dir = target.getAttribute('path');

		State.set(State.key.CURRENT_DIR, dir);
		EventBus.dispatch({ target: this.TARGET, type: EventBus.type.DIR_CHANGE });
		this.update();
	}

	// SEARCH
	toggleSearchMode(force) {
		this.searchBar.classList.toggle('show', force);
		this.searchInput.value = '';
		this.search();

		if (force) this.searchInput.focus({ preventScroll: true });
	}
	search() {
		this.explorer.querySelectorAll('button').toArray().forEach(item => {
			const matches = item.textContent.fuzzyCompare(this.searchInput.value);
			item.classList.toggle('hidden', !matches);
			if (matches) item.innerHTML = this.highlightMatches(item, matches);
		});
	}
	highlightMatches(element, matches) {
		let html = element.textContent;
		for (let i = matches.length - 1; i >= 0; i--) html = html.replaceAt(matches[i], `<b>${html[matches[i]]}</b>`);
		return html;
	}

	async onSetRootDirClick() {
		const root = await Native.FS.openRootDirDialog();
		if (!root) return;

		// await Native.FS.startMediaServer(root);
		State.set(State.key.ROOT_DIR, root);
		this.goto(root);
	}

	// SCROLL
	onScrollToSelectedClick() {
		// navigate to selected dir
		const track = State.get(State.key.TRACK);
		const dir = track.split(Native.FS.PATH_SEPARATOR).slice(0, -1).join(Native.FS.PATH_SEPARATOR);
		this.goto(dir);

		document.querySelector('.selected')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
	}

	// FS
	async listFiles(type = 'all') {
		const current = State.get(State.key.CURRENT_DIR);
		let files = this.cache.get(current);

		if (!files) {
			files = await Native.FS.listFiles(current);
			this.cache.set(current, files);
		}

		return type == 'audio' ? files.filter(f => Native.FS.isAudio(f)).map(f => f.path) : files;
	}
	isAtRoot() {
		return State.get(State.key.CURRENT_DIR).length <= State.get(State.key.ROOT_DIR).length;
	}
	path2src(path) {
		const relativePath = path.substring(State.get(State.key.ROOT_DIR).length + 1);
		return `${location.origin}/%virtual%/${encodeURIComponent(relativePath)}`;
	}

	// UI
	goto(dir) {
		const current = State.get(State.key.CURRENT_DIR);
		if (dir == current) return;

		State.set(State.key.CURRENT_DIR, dir);
		EventBus.dispatch({ target: this.TARGET, type: EventBus.type.DIR_CHANGE });
		return this.update();
	}
	select(target) {
		document.querySelector('explorer .selected')?.classList?.remove('selected'); // deselect previous (if any)
		target.classList.add('selected');
	}

	render() {
		super.render(`
			<breadcrumb-bar>
				<button class="icon i-arrow-up" onclick="${this}.onUpClick()"></button>
				<crumb-list id="crumbs"></crumb-list>
			</breadcrumb-bar>

			<explorer id="explorer"></explorer>
			<explorer-mask></explorer-mask>

			<bottom-bar class="fab">
				<button class="icon i-lock-key-open" onclick="${this}.onSetRootDirClick()"></button>
				<button class="icon i-target" onclick="${this}.onScrollToSelectedClick()"></button>
				<button class="icon i-search" onclick="${this}.toggleSearchMode(true)"></button>
				<button class="icon i-collapse" onclick="${this}.parentElement.resize('collapse')"></button>
			</bottom-bar>

			<search-bar id="search-bar" class="fab">
				<input id="search-input" oninput="${this}.search()" placeholder="Search">
				<button class="icon i-close" onclick="${this}.toggleSearchMode(false)"></button>
			</search-bar>

			<div class="lib">
				<i class="icon i-lock-key-open"></i>
				<p>Please grant access to the root folder<br>of your music library.</p>
			</div>
		`);
	}
	#renderItem(file) {
		return `
			<button path="${file.path}" ondblclick="${this}.onItemClick(this);"
				class="icon ${Native.FS.isDir(file) ? 'i-folder' : 'i-music-note-simple'}
				${State.get(State.key.TRACK) == file.path ? ' selected' : ''}">
				${file.name}
			</button>
		`.minify();
	}
	#renderCrumb(path) {
		const label = path.split(Native.FS.PATH_SEPARATOR).pop();
		return `<button path="${path}" onclick="${this}.onCrumbClick(this);">${label}</button>`;
	}
}

customElements.define('music-explorer', Explorer);
