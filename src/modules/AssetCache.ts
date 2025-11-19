import { writeFile, readFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { app } from 'electron';

interface CachedAsset {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string; // base64
  cachedAt: number;
  ttl: number;
}

/**
 * Кэш для статических ассетов
 */
export class AssetCache {
  private static instance: AssetCache | null = null;
  private cacheDir: string;
  private enabled = false;

  private readonly CACHE_TTL = 4 * 24 * 60 * 60 * 1000; // 4 дня

  // Расширения статических файлов
  private readonly STATIC_EXTENSIONS = [
    '.js',
    '.css',
    '.png',
    '.jpg',
    '.jpeg',
    '.gif',
    '.svg',
    '.webp',
    '.woff',
    '.woff2',
    '.ttf',
    '.eot',
    '.ico',
    '.mp3',
    '.wav',
    '.ogg',
    '.m4a',
  ];

  // Паттерны для определения динамических запросов
  private readonly DYNAMIC_PATTERNS = [
    /\/api\//i,
    /\/v[0-9]+\//i, // API версии типа /v2/
    /\/graphql/i,
    /\.json$/i, // JSON обычно динамические данные
  ];

  private constructor() {
    this.cacheDir = join(app.getPath('temp'), 'soundcloud-cache');
  }

  static getInstance(): AssetCache {
    if (!AssetCache.instance) {
      AssetCache.instance = new AssetCache();
    }
    return AssetCache.instance;
  }

  /**
   * Инициализация кэша
   */
  static async initialize(): Promise<void> {
    const instance = AssetCache.getInstance();
    await instance.start();
  }

  /**
   * Запуск кэша
   */
  private async start(): Promise<void> {
    console.log('💾 Starting asset cache...');

    // Создаем директорию для кэша если не существует
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    this.enabled = true;
    console.log(`💾 Asset cache enabled. Cache dir: ${this.cacheDir}`);

    // Очищаем старый кэш при старте
    this.cleanupOldCache().catch((error) => {
      console.warn('Failed to cleanup old cache:', error);
    });
  }

  /**
   * Определяет, является ли URL статическим ассетом
   */
  isStaticAsset(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      const pathname = parsedUrl.pathname.toLowerCase();

      // Проверяем, не является ли это динамическим запросом
      for (const pattern of this.DYNAMIC_PATTERNS) {
        if (pattern.test(pathname)) {
          return false;
        }
      }

      // Проверяем расширение файла
      for (const ext of this.STATIC_EXTENSIONS) {
        if (pathname.endsWith(ext)) {
          return true;
        }
      }

      // Проверяем версионирование в URL (например, /assets/main.abc123.js или ?v=1.2.3)
      if (
        /\.[a-f0-9]{6,}\.(js|css)$/i.test(pathname) || // hash в имени файла
        /[?&]v=[\d.]+/.test(parsedUrl.search) // версия в query параметре
      ) {
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Проверяет заголовки ответа на кэшируемость
   */
  isCacheableResponse(headers: Record<string, string>): boolean {
    const cacheControl = headers['cache-control']?.toLowerCase() || '';

    // Не кэшируем если явно запрещено
    if (
      cacheControl.includes('no-cache') ||
      cacheControl.includes('no-store') ||
      cacheControl.includes('private')
    ) {
      return false;
    }

    // Не кэшируем если есть Vary заголовок (обычно для динамического контента)
    if (headers['vary']) {
      return false;
    }

    return true;
  }

  /**
   * Генерирует ключ кэша для URL
   */
  private getCacheKey(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }

  /**
   * Получает путь к файлу кэша
   */
  private getCachePath(url: string): string {
    const key = this.getCacheKey(url);
    return join(this.cacheDir, `${key}.json`);
  }

  /**
   * Получает ассет из кэша
   * Возвращает Buffer вместо Response, чтобы избежать проблем с body
   */
  async get(url: string): Promise<{ buffer: Buffer; headers: Record<string, string>; status: number; statusText: string } | null> {
    if (!this.enabled || !this.isStaticAsset(url)) {
      return null;
    }

    const cachePath = this.getCachePath(url);

    try {
      if (!existsSync(cachePath)) {
        return null;
      }

      const content = await readFile(cachePath, 'utf-8');
      const cached: CachedAsset = JSON.parse(content);

      // Проверяем TTL
      const age = Date.now() - cached.cachedAt;
      if (age > cached.ttl) {
        // Кэш устарел - удаляем
        await rm(cachePath).catch(() => {});
        return null;
      }

      console.log(`💾 Cache HIT: ${url} (age: ${Math.round(age / 1000)}s)`);

      // Возвращаем Buffer и метаданные
      return {
        buffer: Buffer.from(cached.body, 'base64'),
        headers: cached.headers,
        status: cached.status,
        statusText: cached.statusText,
      };
    } catch (error) {
      console.warn(`Failed to get cache for ${url}:`, error);
      return null;
    }
  }

  /**
   * Сохраняет ассет в кэш
   * Принимает Buffer вместо Response, чтобы избежать повторного чтения body
   */
  async set(
    url: string,
    buffer: Buffer,
    headers: Record<string, string>,
    status: number,
    statusText: string
  ): Promise<void> {
    if (!this.enabled || !this.isStaticAsset(url)) {
      return;
    }

    try {
      if (!this.isCacheableResponse(headers)) {
        console.log(`💾 Not cacheable (headers): ${url}`);
        return;
      }

      const cached: CachedAsset = {
        url,
        status,
        statusText,
        headers,
        body: buffer.toString('base64'),
        cachedAt: Date.now(),
        ttl: this.CACHE_TTL,
      };

      const cachePath = this.getCachePath(url);
      await writeFile(cachePath, JSON.stringify(cached), 'utf-8');

      console.log(`💾 Cache SET: ${url} (${Math.round(buffer.length / 1024)}kb)`);
    } catch (error) {
      console.warn(`Failed to cache ${url}:`, error);
    }
  }

  /**
   * Очищает устаревший кэш
   */
  private async cleanupOldCache(): Promise<void> {
    console.log('💾 Cleaning up old cache...');

    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.cacheDir);

      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const filePath = join(this.cacheDir, file);

        try {
          const content = await readFile(filePath, 'utf-8');
          const cached: CachedAsset = JSON.parse(content);

          const age = Date.now() - cached.cachedAt;
          if (age > cached.ttl) {
            await rm(filePath);
            cleaned++;
          }
        } catch {
          // Если файл поврежден - удаляем
          await rm(filePath).catch(() => {});
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`💾 Cleaned up ${cleaned} old cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup old cache:', error);
    }
  }

  /**
   * Очищает весь кэш
   */
  async clearAll(): Promise<void> {
    console.log('💾 Clearing all cache...');

    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.cacheDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          await rm(join(this.cacheDir, file));
        }
      }

      console.log('💾 Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }
}
