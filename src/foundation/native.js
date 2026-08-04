var Native = (() => {

	Neutralino.init();

	/**
		const { port } = await Neutralino.custom.startMediaServer({
			root: 'C:\\Users\\you\\Audiobooks',
		});

		const audio = document.getElementById('player');
		audio.src = `http://127.0.0.1:${port}/${encodeURIComponent(filename)}`;

		audio.addEventListener('timeupdate', () => {
			Neutralino.custom.setTaskbarProgress({
				completed: Math.floor(audio.currentTime),
				total: Math.floor(audio.duration || 1),
				state: 2,
			});
		});

		await Neutralino.custom.setTaskbarThumbButtons({
			buttons: [
				{ tooltip: 'Previous', iconPath: 'D:\\Code\\personal\\minimalist-music-desktop\\src\\assets\\icons\\prev.ico' },
				{ tooltip: 'Play/Pause', iconPath: 'D:\\Code\\personal\\minimalist-music-desktop\\src\\assets\\icons\\play.ico' },
				{ tooltip: 'Next', iconPath: 'D:\\Code\\personal\\minimalist-music-desktop\\src\\assets\\icons\\next.ico' },
			]
		});
		Neutralino.events.on('taskbarButtonClicked', (evt) => {
			console.log('clicked button id', evt.detail);
		});

		// call when the app no longer needs streaming (or on shutdown)
		await Neutralino.custom.stopMediaServer();
	 */

	// FS
	const PATH_SEPARATOR = '\/';
	const AUDIO_EXT = /\.(mp3|ogg|aac|flac|wav|m4a|m4b)$/i;

	let mediaServerPort;
	let meiaServerRoot;

	async function openRootDirDialog() {
		const root = await Neutralino.os.showFolderDialog('Select Folder', {
			defaultPath: await Neutralino.os.getPath('music')
		});

		if (!root) return;

		await Neutralino.server.mount('/%virtual%', root);
		return root;
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

	async function startMediaServer(root) {
		const { port } = await Neutralino.custom.startMediaServer({ root });
		mediaServerPort = port;
		meiaServerRoot = root;
		console.log('media server started on port', port);
	}
	async function stopMediaServer() {
		await Neutralino.custom.stopMediaServer();
		mediaServerPort = null;
		meiaServerRoot = null;
	}

	function path2src(path) {
		const relativePath = path.substring(meiaServerRoot.length + 1);
		return `http://localhost:${mediaServerPort}/${encodeURIComponent(relativePath)}`;
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

	function windowProgressBar(status, progress) {
		return Promise.resolve();
	}

	async function windowSetTaskbarThumbButtons(tooltips = ['Previous', 'Play/Pause', 'Next']) {
		await Neutralino.custom.setTaskbarThumbButtons({ tooltips });
	}

	function windowSetDraggableRegion(region, exclusions) {
		Neutralino.window.setDraggableRegion(region, { exclusions: exclusions || [] });
	}

	return {
		FS: {
			PATH_SEPARATOR,
			AUDIO_EXT,

			openRootDirDialog,
			listFiles,
			path2src,

			isAudio,
			isHidden,
			isDir,

			readablePath,

			startMediaServer,
			stopMediaServer,
		},

		Window: {
			title: windowTitle,
			close: closeWindow,
			minimize: minimizeWindow,
			height: windowHeight,
			progressBar: windowProgressBar,
			setDraggableRegion: windowSetDraggableRegion,
			setTaskbarThumbButtons: windowSetTaskbarThumbButtons,
		}
	};

})();
