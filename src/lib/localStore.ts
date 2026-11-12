import type {
  CharacterProfile,
  ChatMessage,
  ImportedAsset,
  Project,
  ScriptDocument,
  StoryboardFrame,
  StoryBeat,
} from '../types/studio';

const DB_NAME = 'roteiro-ld-offline-v1';
const DB_VERSION = 1;
const STORE_WORKSPACE = 'workspace';
const STORE_MEDIA_BLOBS = 'media_blobs';

export interface LocalWorkspaceBundle {
  projects: Project[];
  scripts: Record<string, ScriptDocument[]>;
  frames: Record<string, StoryboardFrame[]>;
  beats: Record<string, StoryBeat[]>;
  characters: Record<string, CharacterProfile[]>;
  assets: Record<string, ImportedAsset[]>;
  chatMessages: Record<string, ChatMessage[]>;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_WORKSPACE)) {
        db.createObjectStore(STORE_WORKSPACE);
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA_BLOBS)) {
        db.createObjectStore(STORE_MEDIA_BLOBS);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadLocalWorkspace(): Promise<LocalWorkspaceBundle | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_WORKSPACE, 'readonly');
      const store = tx.objectStore(STORE_WORKSPACE);
      const req = store.get('bundle');
      req.onsuccess = () => resolve((req.result as LocalWorkspaceBundle) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function saveLocalWorkspace(bundle: LocalWorkspaceBundle): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_WORKSPACE, 'readwrite');
      const store = tx.objectStore(STORE_WORKSPACE);
      const req = store.put(bundle, 'bundle');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveLocalWorkspace warning:', err);
  }
}

export async function saveMediaBlob(assetId: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA_BLOBS, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA_BLOBS);
      const req = store.put(blob, assetId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveMediaBlob warning:', err);
  }
}

export async function loadMediaBlob(assetId: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_MEDIA_BLOBS, 'readonly');
      const store = tx.objectStore(STORE_MEDIA_BLOBS);
      const req = store.get(assetId);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}
