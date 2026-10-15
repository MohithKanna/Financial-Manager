export default class IndexedDBService {
    private dbName: string;
    private dbVersion: number;
    private db: IDBDatabase | null = null;

    constructor(name: string, version: number) {
        this.dbName = name;
        this.dbVersion = version;
    }

    public async init(): Promise<IDBDatabase> {
        if (this.db) return this.db;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
                const db = (event.target as IDBOpenDBRequest).result;
                // TODO: Handle object store creation here if needed during migrations
                if (!db.objectStoreNames.contains("accounts")) {
                    db.createObjectStore("accounts", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("goals")) {
                    db.createObjectStore("goals", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("transactions")) {
                    db.createObjectStore("transactions", { keyPath: "id" });
                }
                if (!db.objectStoreNames.contains("categories")) {
                    db.createObjectStore("categories", { keyPath: "id" });
                }
            };

            request.onsuccess = () => {
                this.db = request.result;

                // Reset cache if the connection closes unexpectedly
                this.db.onclose = () => {
                    this.db = null;
                };

                resolve(this.db);
            };

            request.onerror = () => {
                reject(request.error || new Error("IndexedDB failed to open"));
            };
        });
    }

    private async __transaction<T>(
        storeName: string,
        mode: IDBTransactionMode,
        callback: (store: IDBObjectStore) => IDBRequest,
    ): Promise<T> {
        await this.init();

        if (!this.db) {
            throw new Error("Database is not initialized.");
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(storeName, mode);
            const store: IDBObjectStore = transaction.objectStore(storeName);

            let request: IDBRequest;
            try {
                request = callback(store);
            } catch (err) {
                return reject(err);
            }

            request.onsuccess = () => resolve(request.result as T);
            request.onerror = () => reject(request.error);

            transaction.onerror = () => reject(transaction.error);
            transaction.onabort = () =>
                reject(transaction.error || new Error("Transaction aborted"));
        });
    }

    public async put<T>(
        storeName: string,
        data: T,
        key?: IDBValidKey,
    ): Promise<IDBValidKey> {
        return this.__transaction(storeName, "readwrite", (store) =>
            key !== undefined ? store.put(data, key) : store.put(data),
        );
    }

    public async get<T>(
        storeName: string,
        id: IDBValidKey,
    ): Promise<T | undefined> {
        return this.__transaction(storeName, "readonly", (store) =>
            store.get(id),
        );
    }

    public async getAll<T>(
        storeName: string,
        query?: IDBValidKey | IDBKeyRange | null,
        count?: number,
    ): Promise<T[]> {
        return this.__transaction(storeName, "readonly", (store) =>
            store.getAll(query, count),
        );
    }

    public async delete(
        storeName: string,
        id: IDBValidKey,
    ): Promise<undefined> {
        return this.__transaction(storeName, "readwrite", (store) =>
            store.delete(id),
        );
    }
}
