var Native = (() => {

	const appWindow = window.__TAURI__.window.getCurrentWindow();
	const path = window.__TAURI__.path;
	const fs = window.__TAURI__.fs;
	const dialog = window.__TAURI__.dialog;
	const convertFileSrc = window.__TAURI__.core.convertFileSrc;

	// FS
	const PATH_SEPARATOR = '\\';
	const AUDIO_EXT = /\.(mp3|ogg|aac|flac|wav|m4a|m4b)$/

	async function openRootDirDialog() {
		const root = await dialog.open({
			directory: true,
			multiple: false,
			defaultPath: await path.audioDir()
		});

		if (root == null) return; // user cancelled the selection
		if (Array.isArray(root)) return; // user selected multiple directories

		return root;
	}

	async function listFiles(dir) {
		const files = await fs.readDir(dir);

		return files
			.filter(f => !isHidden(f) && (isDir(f) || isAudio(f))) // get not-hidden directories and audio files
			.map(f => {
				f.path = dir + PATH_SEPARATOR + f.name; // add the path prop - convenient access to absolute path
				return f;
			})
			.sort((a, b) => { // ...and sort them
				if (!isDir(a) && isDir(b)) return 1;
				else if (isDir(a) && !isDir(b)) return -11;
				else return 0;
			});
	}

	function pathToSrc(path) {
		if (path == 'null') return;
		return convertFileSrc(path);
	}

	async function audioDir() {
		return await path.audioDir();
	}

	function isAudio(file) { return file.name.match(AUDIO_EXT) !== null; }
	function isHidden(file) { return file.name.startsWith('.'); }
	function isDir(file) { return file.isDirectory; }

	function readablePath(path) {
		return path.split(Native.FS.PATH_SEPARATOR).pop().replace(AUDIO_EXT, '');
	}

	// APP WINDOW
	function closeWindow() {
		appWindow.close();
	}
	function minimizeWindow() {
		appWindow.minimize();
	}
	function resizeWindow(windowSize) {
		appWindow.setSize(windowSize);
	}
	async function windowSize() {
		return await appWindow.outerSize();
	}
	function windowTitle(title) {
		appWindow.setTitle(title);
	}
	function windowProgressBar(status, progress) {
		return appWindow.setProgressBar({ status, progress: Math.floor(progress) });
	}

	return {
		FS: {
			PATH_SEPARATOR,
			AUDIO_EXT,

			openRootDirDialog,
			listFiles,
			pathToSrc,
			audioDir,

			isAudio,
			isHidden,
			isDir,

			readablePath,
		},

		Window: {
			title: windowTitle,
			close: closeWindow,
			minimize: minimizeWindow,
			resize: resizeWindow,
			size: windowSize,
			progressBar: windowProgressBar,
		}
	}

})();
