# Minimalist Music
Desktop version of the minimalist music player. Currently uses `NeutralinoJS`.

## Features
Nothing fancy, as the name implies
- Support for MP3, FLAC, WAV, AAC, OGG, M4B, ...
- Neumorphic UI design
- Integrated explorer with search
- Media session integration
- Keyboard shortcuts
	- <kbd>**Space**</kbd>: Play/Pause
	- <kbd>**0**</kbd>: Seek to start
	- <kbd>**←**</kbd> / <kbd>**→**</kbd>: Seek jump by 10 seconds
	- <kbd>**CTRL**</kbd> + <kbd>**←**</kbd> / <kbd>**CTRL**</kbd> + <kbd>**→**</kbd>: Play next/prev
	- <kbd>**CTRL**</kbd> + <kbd>**F**</kbd>: Search
	- <kbd>**F5**</kbd>: Refresh the metadata for the current track

## Screenshots
![Screenshots](screenshots/screenshots.png)

## Develop
### Run Locally
- Install NodeJS
- Run `neu run`

### Build
Run the command `neu build --release`

### Notes
#### Using WebWorkers
I couldn't use webworkers for doing the visualization because they don't have access to the AudioContext API\
And since I'm already storing the metadata, it just didn't matter to just move the music-metadata call to a webworker.

That has changed! The metadata is now read using a webworker that runs after the `loadeddata` event of the `audio` element fires.\
This is to ensure the fastest click-to-play time.\
The metadata is also cached in an indexedDB by `src` which is also accessed by the webworker.

#### Metadata Library Comparison
jsmediatags is at least twice as slow as music metadata browser

```
// #1
musicMetadata
	.fetchFromUrl("https://asset.localhost/D%3A%5CMusic%20%2B%20Audiobooks%5CMISC%5CBOOKS%5CAd%20Astra%5C01%20-%20Intro%20%2B%20Lady%20Be%20Good.mp3")
	.then(res => console.log(res))
```
```
// #2
jsmediatags.Config.setDisallowedXhrHeaders(['If-Modified-Since', 'Range'])
jsmediatags.read("https://asset.localhost/D%3A%5CMusic%20%2B%20Audiobooks%5CMISC%5CBOOKS%5CAd%20Astra%5C01%20-%20Intro%20%2B%20Lady%20Be%20Good.mp3", {
	onSuccess: function(tag) { console.log(tag); },
	onError: function(error) { console.log(error); }
});
```
