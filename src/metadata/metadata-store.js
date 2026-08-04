class MetadataStore {
	constructor() {
		new FluentDB('metadataDB', 1)
			.objectStore('files', { keyPath: 'src' })
			.open()
			.then(db => this.db = db);
	}

	async getItem(src) {
		return await this.db.select('files', src);
	}

	async setItem(metadata) {
		await this.db.upsert('files', metadata);
	}

	async removeItem(src) {
		await this.db.delete('files', src);
	}
}