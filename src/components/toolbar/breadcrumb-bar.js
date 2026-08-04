var BreadcrumbBar = (() => {

	const SELF = EventBus.target.BREADCRUMB_BAR;

	const container = document.querySelector('breadcrumb-bar');
	const crumbs = container?.querySelector('crumb-list');

	// EVENT BUS
	EventBus.subscribe((event) => {
		if (event.target == SELF) return;

		when(event.type)
			.is(EventBus.type.DIR_CHANGE, () => update());
	});

	function update() {
		const current = State.get(State.key.CURRENT_DIR);

		crumbs.innerHTML = '';
		current.split(Native.FS.PATH_SEPARATOR).reduce((acc, curr) => {
			if (!curr) return acc;

			const pathSegment = acc ? acc + Native.FS.PATH_SEPARATOR + curr : curr;

			crumbs.insertAdjacentHTML('beforeend', crumb(pathSegment));

			return pathSegment;

		}, '');

		crumbs.scrollTo(crumbs.scrollWidth, 0);
	}

	function up() {
		if (Explorer.isAtRoot()) return; // don't go back beyond the root

		const current = State.get(State.key.CURRENT_DIR);

		const segments = current.split(Native.FS.PATH_SEPARATOR);
		segments.pop();
		const dir = segments.join(Native.FS.PATH_SEPARATOR);

		State.set(State.key.CURRENT_DIR, dir);
		EventBus.dispatch({ target: SELF, type: EventBus.type.DIR_CHANGE });
		update();
	}

	function crumb(path) {
		const label = path.split(Native.FS.PATH_SEPARATOR).pop();
		return `<button path="${path}" onclick="BreadcrumbBar.onCrumbClick(this)" class="color-foreground-light">${label}</button>`;
	}

	function onCrumbClick(target) {
		const dir = target.getAttribute('path');

		State.set(State.key.CURRENT_DIR, dir);
		EventBus.dispatch({ target: SELF, type: EventBus.type.DIR_CHANGE });
		update();
	}

	return {
		update,
		onCrumbClick,
		up
	}

});
