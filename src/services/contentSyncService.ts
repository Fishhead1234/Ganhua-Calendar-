import bundledQuotes365 from '../data/quotes365.json';
import bundledBirthdayQuotes from '../data/birthday_quotes.json';
import bundledScenesManifest from '../data/scenes_manifest.json';
import { RawStaticQuote365 } from '../types/calendar';

export interface RemoteVersionManifest {
  version: number;
  updatedAt: string;
  baseAssetUrl: string;
  files?: {
    quotes365?: string;
    birthdayQuotes?: string;
    scenesManifest?: string;
  };
}

const STORAGE_KEYS = {
  VERSION: 'ganhua_ota_version',
  UPDATED_AT: 'ganhua_ota_updated_at',
  BASE_URL: 'ganhua_ota_base_url',
  QUOTES_365: 'ganhua_ota_quotes365',
  BIRTHDAY_QUOTES: 'ganhua_ota_birthday_quotes',
  SCENES_MANIFEST: 'ganhua_ota_scenes_manifest',
};

// Default remote manifest URL:
// 1. In web environment: uses window.location.origin
// 2. Custom override via localStorage or environment
const DEFAULT_REMOTE_ENDPOINT = '/version.json';

class ContentSyncService {
  private currentVersion: number = 0;
  private isChecking: boolean = false;
  private listeners: Set<(status: 'updated' | 'error' | 'up-to-date') => void> = new Set();

  constructor() {
    this.currentVersion = this.getCachedVersion();
  }

  public getCachedVersion(): number {
    try {
      const v = localStorage.getItem(STORAGE_KEYS.VERSION);
      return v ? parseInt(v, 10) : 0;
    } catch {
      return 0;
    }
  }

  public getBaseAssetUrl(): string {
    try {
      return localStorage.getItem(STORAGE_KEYS.BASE_URL) || '';
    } catch {
      return '';
    }
  }

  public setBaseAssetUrl(url: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BASE_URL, url.replace(/\/+$/, ''));
    } catch {
      // ignore
    }
  }

  /**
   * Returns current active 365 quotes dataset:
   * Checks OTA localStorage cache first; falls back to bundled quotes365.json
   */
  public getQuotes365(): RawStaticQuote365[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.QUOTES_365);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.resolveAssetUrlsInQuotes(parsed);
        }
      }
    } catch {
      // ignore
    }
    return this.resolveAssetUrlsInQuotes(bundledQuotes365 as RawStaticQuote365[]);
  }

  /**
   * Returns current active birthday quotes:
   * Checks OTA cache first, falls back to bundled dataset
   */
  public getBirthdayQuotes(): any[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.BIRTHDAY_QUOTES);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return this.resolveAssetUrlsInQuotes(parsed);
        }
      }
    } catch {
      // ignore
    }
    return this.resolveAssetUrlsInQuotes(bundledBirthdayQuotes);
  }

  /**
   * Returns current active scenes manifest
   */
  public getScenesManifest(): any[] {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.SCENES_MANIFEST);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
    return bundledScenesManifest;
  }

  /**
   * Prepends baseAssetUrl to spriteSheet paths if baseAssetUrl is set and paths are relative
   */
  private resolveAssetUrlsInQuotes<T extends { spriteSheet?: string }>(items: T[]): T[] {
    const baseUrl = this.getBaseAssetUrl();
    if (!baseUrl) return items;

    return items.map((item) => {
      if (item.spriteSheet && item.spriteSheet.startsWith('/assets/')) {
        return {
          ...item,
          spriteSheet: `${baseUrl}${item.spriteSheet}`,
        };
      }
      return item;
    });
  }

  /**
   * Checks for remote OTA updates from /version.json or configured remote server.
   * If remote version > cached version, downloads quotes365.json & assets manifest in background.
   */
  public async checkForUpdates(customEndpoint?: string): Promise<{ updated: boolean; version: number }> {
    if (this.isChecking) {
      return { updated: false, version: this.currentVersion };
    }

    this.isChecking = true;
    try {
      const endpoint = customEndpoint || (this.getBaseAssetUrl() ? `${this.getBaseAssetUrl()}/version.json` : DEFAULT_REMOTE_ENDPOINT);
      const res = await fetch(`${endpoint}?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch remote manifest: HTTP ${res.status}`);
      }

      const manifest: RemoteVersionManifest = await res.json();
      const remoteVer = manifest.version || 1;
      const cachedVer = this.getCachedVersion();

      if (manifest.baseAssetUrl && manifest.baseAssetUrl !== 'https://YOUR-WEB-APP-DOMAIN.com') {
        this.setBaseAssetUrl(manifest.baseAssetUrl);
      }

      if (remoteVer > cachedVer) {
        // Download remote updated content
        await this.syncRemoteContent(manifest);
        this.currentVersion = remoteVer;
        localStorage.setItem(STORAGE_KEYS.VERSION, String(remoteVer));
        localStorage.setItem(STORAGE_KEYS.UPDATED_AT, manifest.updatedAt || new Date().toISOString());

        this.notifyListeners('updated');
        return { updated: true, version: remoteVer };
      }

      this.notifyListeners('up-to-date');
      return { updated: false, version: cachedVer };
    } catch (err) {
      console.warn('[OTA Sync] Check update failed:', err);
      this.notifyListeners('error');
      return { updated: false, version: this.currentVersion };
    } finally {
      this.isChecking = false;
    }
  }

  private async syncRemoteContent(manifest: RemoteVersionManifest): Promise<void> {
    const baseUrl = manifest.baseAssetUrl && manifest.baseAssetUrl !== 'https://YOUR-WEB-APP-DOMAIN.com'
      ? manifest.baseAssetUrl.replace(/\/+$/, '')
      : '';

    const quotesUrl = manifest.files?.quotes365 || '/quotes365.json';
    const bdayUrl = manifest.files?.birthdayQuotes || '/birthday_quotes.json';
    const scenesUrl = manifest.files?.scenesManifest || '/scenes_manifest.json';

    // Fetch in parallel
    const [qRes, bRes, sRes] = await Promise.allSettled([
      fetch(`${baseUrl}${quotesUrl}?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${baseUrl}${bdayUrl}?t=${Date.now()}`).then((r) => r.json()),
      fetch(`${baseUrl}${scenesUrl}?t=${Date.now()}`).then((r) => r.json()),
    ]);

    if (qRes.status === 'fulfilled' && Array.isArray(qRes.value)) {
      localStorage.setItem(STORAGE_KEYS.QUOTES_365, JSON.stringify(qRes.value));
    }
    if (bRes.status === 'fulfilled' && Array.isArray(bRes.value)) {
      localStorage.setItem(STORAGE_KEYS.BIRTHDAY_QUOTES, JSON.stringify(bRes.value));
    }
    if (sRes.status === 'fulfilled' && Array.isArray(sRes.value)) {
      localStorage.setItem(STORAGE_KEYS.SCENES_MANIFEST, JSON.stringify(sRes.value));
    }
  }

  public subscribe(cb: (status: 'updated' | 'error' | 'up-to-date') => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notifyListeners(status: 'updated' | 'error' | 'up-to-date') {
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch {
        // ignore
      }
    });
  }
}

export const contentSyncService = new ContentSyncService();

