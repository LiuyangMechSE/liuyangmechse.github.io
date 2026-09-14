// Keep the editable snapshot and its uploaded media in one atomic record.
// This database belongs to this site's editor, never to the public page.
const databaseName = 'liuyangmechse.github.io-editor';
const storeName = 'drafts';
const snapshotKey = 'current';

export type DraftSnapshot = {
  content: unknown;
  base: unknown;
  updatedAt: string;
  uploads: {path: string; blob: Blob}[];
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('This browser does not support saving editor drafts.'));
      return;
    }
    let request: IDBOpenDBRequest;
    try { request = indexedDB.open(databaseName, 1); }
    catch (error) { reject(error); return; }
    let settled = false;
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName);
      }
    };
    request.onerror = () => {
      settled = true;
      reject(request.error ?? new Error('The saved draft could not be opened.'));
    };
    request.onblocked = () => {
      settled = true;
      reject(new Error('Close other editor tabs and try saving the draft again.'));
    };
    request.onsuccess = () => {
      const db = request.result;
      if (settled) { db.close(); return; }
      settled = true;
      db.onversionchange = () => db.close();
      resolve(db);
    };
  });
}

// Serialize operations so a delayed save cannot overwrite a newer save or clear.
let pending: Promise<unknown> = Promise.resolve();
function ordered<T>(operation: () => Promise<T>): Promise<T> {
  const result = pending.then(operation, operation);
  pending = result.catch(() => undefined);
  return result;
}

async function transact<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    let transaction: IDBTransaction;
    let request: IDBRequest<T>;
    try {
      transaction = db.transaction(storeName, mode);
      request = operation(transaction.objectStore(storeName));
    } catch (error) {
      db.close();
      reject(error);
      return;
    }
    let value: T;
    request.onsuccess = () => { value = request.result; };
    // A successful put request is not yet durable: wait for transaction commit.
    transaction.oncomplete = () => { db.close(); resolve(value); };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error ?? request.error ?? new Error('The draft could not be saved.'));
    };
    transaction.onerror = () => {
      // The default error action aborts this transaction; onabort reports it.
    };
  });
}

export function readDraftSnapshot(): Promise<unknown> {
  return ordered(() => transact('readonly', store => store.get(snapshotKey)));
}

export function writeDraftSnapshot(snapshot: DraftSnapshot): Promise<void> {
  return ordered(async () => { await transact('readwrite', store => store.put(snapshot, snapshotKey)); });
}

export function deleteDraftSnapshot(): Promise<void> {
  return ordered(async () => { await transact('readwrite', store => store.delete(snapshotKey)); });
}
