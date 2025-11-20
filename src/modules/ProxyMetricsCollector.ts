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
   * Запуск сборщика метрик
   */
  private async start(): Promise<void> {
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
   * Сохранить метрики в файл
   */
  private async saveMetrics(): Promise<void> {
    if (this.domainMetrics.size === 0) {
      return;
    }

    // Конвертируем Map в Object и сортируем по count (больше → меньше)
    const sortedEntries = Array.from(this.domainMetrics.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );

    const metrics: ProxyMetrics = {
      domains: Object.fromEntries(sortedEntries),
    };

    await writeFile(this.metricsFilePath, JSON.stringify(metrics, null, 2), 'utf-8');
  }

  /**
   * Получить текущие метрики
   */
  getMetrics(): ProxyMetrics {
    const sortedEntries = Array.from(this.domainMetrics.entries()).sort(
      (a, b) => b[1].count - a[1].count
    );

    return {
      domains: Object.fromEntries(sortedEntries),
    };
  }

  /**
   * Очистить метрики
   */
  clearMetrics(): void {
    this.domainMetrics.clear();
  }
}
