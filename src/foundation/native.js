var Native = (() => {

	Neutralino.init();
	Neutralino.window.setIcon('/src/assets/images/appIcon.png');

	// FS
	const PATH_SEPARATOR = '\/';
	const AUDIO_EXT = /\.(mp3|ogg|aac|flac|wav|m4a|m4b)$/i;

	async function openRootDirDialog() {
		const root = await Neutralino.os.showFolderDialog('Select Folder', {
			defaultPath: await Neutralino.os.getPath('music')
		});

		if (!root) return;

		await mountRootDir(root);
		return root;
	}
	function mountRootDir(root) {
		return Neutralino.server.mount('/%virtual%', root);
	}

	async function listFiles(dir) {
		const entries = await Neutralino.filesystem.readDirectory(dir);

		const files = entries
			.map(e => ({
				name: e.entry,
				isDirectory: e.type == 'DIRECTORY',
				isFile: e.type == 'FILE'
			}))
			.filter(f => !isHidden(f) && (isDir(f) || isAudio(f))) // get not-hidden directories and audio files
			.map(f => {
				const sep = (dir.endsWith('\\') || dir.endsWith('/')) ? '' : PATH_SEPARATOR;
				f.path = dir + sep + f.name; // add the path prop - convenient access to absolute path
				return f;
			})
			.sort((a, b) => { // ...and sort them
				if (!isDir(a) && isDir(b)) return 1;
				else if (isDir(a) && !isDir(b)) return -11;
				else return 0;
			});

		return files;
	}

	function isAudio(file) { return file.name.match(AUDIO_EXT) != null; }
	function isHidden(file) { return file.name.startsWith('.'); }
	function isDir(file) { return file.isDirectory; }

	function readablePath(path) {
		return path.split(Native.FS.PATH_SEPARATOR).pop().replace(AUDIO_EXT, '');
	}

	// APP WINDOW
	function closeWindow() {
		Neutralino.app.exit();
	}
	function minimizeWindow() {
		Neutralino.window.minimize();
	}
	function windowHeight(height) {
		Neutralino.window.setSize({ width: 576, height });
	}
	function windowTitle(title) {
		Neutralino.window.setTitle(title);
	}
	function windowSetDraggableRegion(region, exclusions) {
		Neutralino.window.setDraggableRegion(region, { exclusions: exclusions || [] });
	}

	function taskbarSetProgress(state, value, max = 100) {
		// 'normal' | 'paused' | 'error' | 'indeterminate' | 'none'
		return Neutralino.custom.setTaskbarProgress({ state, value: Math.floor(value), max: Math.floor(max) });
	}
	function taskbarSetThumbButtons(buttons, handler) {
		// button: { id: 101, tooltip: "Previous Track", icon: prevIconBase64 }
		// const buttonId = event.detail.id;
		// ...
		if (handler) Neutralino.events.on('taskbarbuttonclick', handler);
		return Neutralino.custom.setTaskbarButtons({ buttons });
	}
	function taskbarSetThumbnail(base64) {
		return Neutralino.custom.setTaskbarThumbnail({ data: base64 });
	}

	return {
		FS: {
			PATH_SEPARATOR,
			AUDIO_EXT,

			openRootDirDialog,
			mountRootDir,
			listFiles,

			isAudio,
			isHidden,
			isDir,

			readablePath
		},

		Window: {
			setTitle: windowTitle,
			close: closeWindow,
			minimize: minimizeWindow,
			setHeight: windowHeight,
			setDraggableRegion: windowSetDraggableRegion
		},

		Taskbar: {
			setProgress: taskbarSetProgress,
			setThumbButtons: taskbarSetThumbButtons,
			setThumbnail: taskbarSetThumbnail
		}
	};

})();
