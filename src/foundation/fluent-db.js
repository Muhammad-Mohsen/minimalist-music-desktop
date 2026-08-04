/**
 * constructor function for an IndexedDB database.
 * @type {FluentDB}
 * @param {string} name The name of the database.
 * @param {number} version The version of the database.
 */
class FluentDB {

	constructor(name, version) {
		this.name = name;
		this.version = version;
	}

	/**
	 * @type {FDBObjectStore[]}
	 * An array of store objects.
	 */
	stores = [];

	/**
	 * Creates a new object store.
	 *
	 * @param {string} name The name of the object store.
	 * @param {FDBObjectStoreOptions} options The options for the object store.
	 * @returns {FluentDB} This instance of FluentDB.
	 */
	objectStore(name, options) {
		this.stores.push({ name, options });
		return this;
	}

	/**
	 * Creates/Opens the database.
	 *
	 * @returns {Promise<IDBDatabase>} A promise that resolves to the database object.
	 */
	open() {
		return new Promise((resolve, reject) => {
			const dbRequest = indexedDB.open(this.name, this.version);
			dbRequest.onerror = (event) => reject(event);
			dbRequest.onsuccess = () => {
				if (dbRequest.readyState == 'done') return resolve(dbRequest.result);
			};

			dbRequest.onupgradeneeded = event => {
				const db = event.target.result;

				this.stores.forEach(s => {
					const store = db.createObjectStore(s.name, s.options);
					s.options.indexes?.forEach(i => {
						store.createIndex(i.name, i.prop, i.options);
					});
				});
			};
		});
	}
}

// a bunch of method extensions to IDBDatabase
IDBDatabase.prototype.select = function (store, key) {
	return new Promise((resolve, reject) => {
		const transaction = this.transaction([store]);
		const objectStore = transaction.objectStore(store);

		const request = objectStore.get(key);
		transaction.oncomplete = (event) => resolve(request.result, event);
		transaction.onerror = (event) => reject(event);
	});
}

IDBDatabase.prototype.selectAll = function (store) {
	return new Promise((resolve, reject) => {
		const objectStore = this.transaction(store).objectStore(store);
		objectStore.getAll().onsuccess = (event) => {
			resolve(event.target.result);
		};
	});
}

IDBDatabase.prototype.upsert = function (store, objects) {
	return new Promise((resolve, reject) => {
		const transaction = this.transaction([store], 'readwrite');
		const objectStore = transaction.objectStore(store);

		if (!Array.isArray(objects)) objects = [objects];
		objects.forEach(o => objectStore.put(o));
		transaction.oncomplete = (event) => resolve(event);
		transaction.onerror = (event) => reject(event);
	});
}

IDBDatabase.prototype.delete = function (store, keys) {
	return new Promise((resolve, reject) => {
		const transaction = this.transaction([store], 'readwrite');
		const objectStore = transaction.objectStore(store);

		if (!Array.isArray(keys)) keys = [keys];
		keys.forEach(k => objectStore.delete(k));
		transaction.oncomplete = (event) => resolve(event);
		transaction.onerror = (event) => reject(event);
	});
}

/**
 * @typedef {Object} FDBObjectStoreOptions
 * @property {boolean} [autoIncrement]
 * @property {string} [keyPath]
 * @property {{name: string, property: string, options: IDBIndexParameters}[]} [indexes]
 */

/**
 * @typedef {Object} FDBObjectStore
 * @property {string} name
 * @property {FDBObjectStoreOptions} options
 */