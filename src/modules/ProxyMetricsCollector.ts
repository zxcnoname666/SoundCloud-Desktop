import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { app } from 'electron';

interface DomainMetric {
  count: number;
  proxied: boolean;
  reason: string;
  lastUsed: string;
}

interface ProxyMetrics {
  domains: Record<string, DomainMetric>;
}

/**
 * Сборщик метрик использования доменов для отладки
 * Работает только в dev режиме
 */
export class ProxyMetricsCollector {
  private static instance: ProxyMetricsCollector | null = null;
  private domainMetrics: Map<string, DomainMetric> = new Map();
  private saveInterval: NodeJS.Timeout | null = null;
  private metricsFilePath: string;
  private isStarted = false; // Флаг для предотвращения повторной инициализации
  private isSaving = false; // Флаг для предотвращения параллельного сохранения

  private readonly SAVE_INTERVAL = 10 * 1000; // 10 секунд

  private constructor() {
    // Сохраняем в корень проекта для удобства отладки
    const debugDir = join(app.getAppPath(), '.debug');
    this.metricsFilePath = join(debugDir, 'proxy-metrics.json');
  }

  static getInstance(): ProxyMetricsCollector {
    if (!ProxyMetricsCollector.instance) {
      ProxyMetricsCollector.instance = new ProxyMetricsCollector();
    }
    return ProxyMetricsCollector.instance;
  }

  /**
   * Инициализация сборщика метрик (только в dev режиме)
   */
  static async initialize(): Promise<void> {
    // Проверяем, запущено ли приложение в dev режиме
    const isDev = process.argv.includes('--dev') || process.env['NODE_ENV'] === 'development';

    if (!isDev) {
      console.debug('📊 Proxy metrics collector disabled (not in dev mode)');
      return;
    }

    const instance = ProxyMetricsCollector.getInstance();
    await instance.start();
  }

  /**
   * Записать использование домена
   */
  recordDomainUsage(hostname: string, proxied: boolean, reason: string): void {
    const existing = this.domainMetrics.get(hostname);

    if (existing) {
      existing.count++;
      existing.lastUsed = new Date().toISOString();
      existing.proxied = proxied;
      existing.reason = reason;
    } else {
      this.domainMetrics.set(hostname, {
        count: 1,
        proxied,
        reason,
        lastUsed: new Date().toISOString(),
      });
    }
  }

  /**
   * Получить текущие метрики
   */
  getMetrics(): ProxyMetrics {
    return {
      domains: this.getSortedMetricsObject(),
    };
  }

  /**
   * Очистить метрики
   */
  clearMetrics(): void {
    this.domainMetrics.clear();
  }

  /**
   * Запуск сборщика метрик
   */
  private async start(): Promise<void> {
    if (this.isStarted) {
      console.debug('📊 Proxy metrics collector already started');
      return;
    }

    this.isStarted = true;
    console.info('📊 Starting proxy metrics collector...');

    // Создаем директорию для метрик если не существует
    const debugDir = join(app.getAppPath(), '.debug');
    if (!existsSync(debugDir)) {
      await mkdir(debugDir, { recursive: true });
    }

    // Запускаем автосохранение каждые 10 секунд
    this.saveInterval = setInterval(() => {
      this.saveMetrics().catch((error) => {
        console.warn('Failed to save proxy metrics:', error);
      });
    }, this.SAVE_INTERVAL);

    console.info(`📊 Proxy metrics collector started. Saving to: ${this.metricsFilePath}`);

    // Сохраняем метрики при закрытии приложения
    app.on('before-quit', () => {
      this.stop();
    });
  }

  /**
   * Остановка сборщика метрик
   */
  private stop(): void {
    if (!this.isStarted) {
      return;
    }

    this.isStarted = false;

    if (this.saveInterval) {
      clearInterval(this.saveInterval);
      this.saveInterval = null;
    }

    // Финальное сохранение
    this.saveMetrics().catch((error) => {
      console.warn('Failed to save final proxy metrics:', error);
    });

    console.info('📊 Proxy metrics collector stopped');
  }

  /**
   * Получить отсортированные метрики в виде объекта
   */
  private getSortedMetricsObject(): Record<string, DomainMetric> {
    const sortedEntries = Array.from(this.domainMetrics.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );
    return Object.fromEntries(sortedEntries);
  }

  /**
   * Сохранить метрики в файл
   */
  private async saveMetrics(): Promise<void> {
    if (this.isSaving || this.domainMetrics.size === 0) {
      return;
    }

    this.isSaving = true;

    try {
      const metrics: ProxyMetrics = {
        domains: this.getSortedMetricsObject(),
      };

      await writeFile(this.metricsFilePath, JSON.stringify(metrics, null, 2), 'utf-8');
    } catch (error) {
      console.warn('Error during saveMetrics:', error);
    } finally {
      this.isSaving = false;
    }
  }
}
