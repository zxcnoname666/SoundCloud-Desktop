import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {app} from 'electron';

interface CachedAssetMetadata {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
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
    '.m4s', // MPEG-DASH media segments
    '.ts', // HLS media segments
    '.aac', // AAC audio
    '.flac', // FLAC audio
    '.opus', // Opus audio
    '.mp4',
    '.m3u8',
  ];

  // Медиа-сегменты, для которых нужно отсекать query параметры при кэшировании
  // (подписи в query меняются, но контент файла одинаковый)
  private readonly MEDIA_SEGMENT_EXTENSIONS = ['.m4s', '.ts', '.mp4', '.m3u8', '.mp3'];

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
    if (!this.enabled) {
      return;
    }

    const isStatic = this.isStaticAsset(url);
    const hasCacheableHeaders = this.isCacheableResponse(headers);

    // Кэшируем если ВСЁ из STATIC_EXTENSIONS ЛИБО с правильным cache-control заголовком
    if (!isStatic && !hasCacheableHeaders) {
      // console.log(`💾 Skip cache (not static and no cacheable headers): ${url}`);
      return;
    }

    try {
      const metadata: CachedAssetMetadata = {
        url,
        status,
        statusText,
        headers,
        cachedAt: Date.now(),
        ttl: this.CACHE_TTL,
      };

      const metadataPath = this.getCacheMetadataPath(url);
      const dataPath = this.getCacheDataPath(url);

      // Сохраняем метаданные и бинарные данные отдельно
      await Promise.all([
        writeFile(metadataPath, JSON.stringify(metadata), 'utf-8'),
        writeFile(dataPath, buffer),
      ]);

      const reason = isStatic ? 'static extension' : 'cacheable headers';
      console.debug(`💾 Cache SET: ${url} (${Math.round(buffer.length / 1024)}kb) [${reason}]`);
    } catch (error) {
      console.warn(`Failed to cache ${url}:`, error);
    }
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

      // Проверяем, является ли это страницей без расширения (например /discover, /rest)
      // Берем последнюю часть пути после последнего слэша
      const lastSegment = pathname.split('/').pop() || '';
      // Если в последней части нет точки - это страница (не файл), не кэшируем
      if (lastSegment && !lastSegment.includes('.')) {
        return false;
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

    // Не кэшируем только если явно запрещено
    if (
      cacheControl.includes('no-cache') ||
      cacheControl.includes('no-store') ||
      cacheControl.includes('private')
    ) {
      return false;
    }

    // Vary: Accept-Encoding - нормально для статики, кэшируем
    // Другие Vary тоже OK для статических ассетов
    return true;
  }

  /**
   * Генерирует ключ кэша для URL
   * Для медиа-сегментов (.m4s, .ts) отсекает query параметры
   */
  private getCacheKey(url: string): string {
    let cacheUrl = url;

    // Для медиа-сегментов отсекаем query параметры (подписи меняются, контент нет)
    const hasMediaSegmentExt = this.MEDIA_SEGMENT_EXTENSIONS.some((ext) => url.includes(ext));

    if (hasMediaSegmentExt) {
      // Убираем всё после ? (включая подпись)
      const questionMarkIndex = url.indexOf('?');
      if (questionMarkIndex !== -1) {
        cacheUrl = url.substring(0, questionMarkIndex);
      }
    }

      return createHash('sha1').update(cacheUrl).digest('hex');
  }

  /**
   * Получает путь к файлу с метаданными кэша
   */
  private getCacheMetadataPath(url: string): string {
    const key = this.getCacheKey(url);
    return join(this.cacheDir, `${key}.json`);
  }

  /**
   * Получает путь к файлу с бинарными данными кэша
   */
  private getCacheDataPath(url: string): string {
    const key = this.getCacheKey(url);
    return join(this.cacheDir, `${key}.bin`);
  }

  /**
   * Получает ассет из кэша
   * Возвращает Buffer вместо Response, чтобы избежать проблем с body
   */
  async get(url: string): Promise<{
    buffer: Buffer;
    headers: Record<string, string>;
    status: number;
    statusText: string;
  } | null> {
    if (!this.enabled) {
      return null;
    }

    const metadataPath = this.getCacheMetadataPath(url);
    const dataPath = this.getCacheDataPath(url);

    try {
      if (!existsSync(metadataPath) || !existsSync(dataPath)) {
        return null;
      }

      const content = await readFile(metadataPath, 'utf-8');
      const metadata: CachedAssetMetadata = JSON.parse(content);

      // Проверяем TTL
      const age = Date.now() - metadata.cachedAt;
      if (age > metadata.ttl) {
        // Кэш устарел - удаляем оба файла
        await Promise.all([rm(metadataPath).catch(() => {}), rm(dataPath).catch(() => {})]);
        return null;
      }

      console.debug(`💾 Cache HIT: ${url} (age: ${Math.round(age / 1000)}s)`);

      // Читаем бинарные данные
      const buffer = await readFile(dataPath);

      // Возвращаем Buffer и метаданные
      return {
        buffer,
        headers: metadata.headers,
        status: metadata.status,
        statusText: metadata.statusText,
      };
    } catch (error) {
      console.warn(`Failed to get cache for ${url}:`, error);
      return null;
    }
  }

  /**
   * Очищает весь кэш
   */
  async clearAll(): Promise<void> {
    console.info('💾 Clearing all cache...');

    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.cacheDir);

      for (const file of files) {
        if (file.endsWith('.json') || file.endsWith('.bin')) {
          await rm(join(this.cacheDir, file));
        }
      }

      console.info('💾 Cache cleared');
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Запуск кэша
   */
  private async start(): Promise<void> {
    console.info('💾 Starting asset cache...');

    // Создаем директорию для кэша если не существует
    if (!existsSync(this.cacheDir)) {
      await mkdir(this.cacheDir, { recursive: true });
    }

    this.enabled = true;
    console.info(`💾 Asset cache enabled. Cache dir: ${this.cacheDir}`);

    // Очищаем старый кэш при старте
    this.cleanupOldCache().catch((error) => {
      console.warn('Failed to cleanup old cache:', error);
    });
  }

  /**
   * Очищает устаревший кэш
   */
  private async cleanupOldCache(): Promise<void> {
    console.info('💾 Cleaning up old cache...');

    try {
      const { readdir } = await import('node:fs/promises');
      const files = await readdir(this.cacheDir);

      let cleaned = 0;

      for (const file of files) {
        if (!file.endsWith('.json')) continue;

        const metadataPath = join(this.cacheDir, file);
        const dataPath = metadataPath.replace('.json', '.bin');

        try {
          const content = await readFile(metadataPath, 'utf-8');
          const metadata: CachedAssetMetadata = JSON.parse(content);

          const age = Date.now() - metadata.cachedAt;
          if (age > metadata.ttl) {
            // Удаляем оба файла
            await Promise.all([rm(metadataPath).catch(() => {}), rm(dataPath).catch(() => {})]);
            cleaned++;
          }
        } catch {
          // Если файл поврежден - удаляем оба файла
          await Promise.all([rm(metadataPath).catch(() => {}), rm(dataPath).catch(() => {})]);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.info(`💾 Cleaned up ${cleaned} old cache entries`);
      }
    } catch (error) {
      console.warn('Failed to cleanup old cache:', error);
    }
  }
}
