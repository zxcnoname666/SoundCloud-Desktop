import {app, BrowserWindow} from 'electron';
import {Client} from 'qurre-socket';
import {join} from 'path';
import {AppManager} from './modules/AppManager.js';
import {ProxyManager} from './modules/ProxyManager.js';
import {Extensions} from './modules/Extensions.js';
import {TCPPortChecker} from './modules/TCPPortChecker.js';
import {WindowSetup} from './modules/WindowSetup.js';
import {NotificationManager} from './modules/NotificationManager.js';
import {AuthManager} from './modules/AuthManager.js';
import {ConfigManager} from './utils/config.js';
import type {AppContext} from './types/global.js';

class SoundCloudApp {
    private context: AppContext;
    private appManager: AppManager;
    private notifyManager: NotificationManager;

    constructor() {
        this.context = {
            isDev: process.env['NODE_ENV'] === 'development' || process.argv.includes('--dev'),
            port: 0, // Will be set after initialization
        };

        this.context.port = this.context.isDev ? 3535 : 45828;
        this.appManager = new AppManager();
        // NotifyManager будет инициализирован после app.whenReady()
        this.notifyManager = null as any;

        this.initializeConfig();
    }

    async initialize(): Promise<void> {
        // Проверяем что мы в Electron среде
        if (!app || typeof app.whenReady !== 'function') {
            console.error('❌ This application must be run in Electron environment');
            console.log('💡 Try running: pnpm start (after pnpm build:app)');
            process.exit(1);
        }

        await app.whenReady();

        // Инициализируем NotificationManager после того как Electron готов
        this.notifyManager = NotificationManager.getInstance();

        // Инициализируем AuthManager для работы с аутентификацией
        const authManager = AuthManager.getInstance();
        authManager.initialize();

        this.setupAppEvents();
        await this.startup();
    }

    private initializeConfig(): void {
        try {
            const configManager = ConfigManager.getInstance();
            configManager.loadConfig();
            console.log('✅ Configuration loaded successfully');
        } catch (error) {
            console.warn('⚠️  Failed to load configuration:', error);
            // Continue with defaults
        }
    }

    private setupAppEvents(): void {
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('web-contents-created', (_ev, contents) => {
            this.handleWebContentsCreated(contents);
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.startup().catch(console.error);
            }
        });
    }

    private handleWebContentsCreated(contents: Electron.WebContents): void {
        try {
            console.log(`Window created: ${contents.getType()}`);
        } catch (error) {
            console.warn('Failed to log window type:', error);
        }

        WindowSetup.hookNewWindow(contents);
        WindowSetup.setupCors(contents.session);

        // Логируем создание webview для отладки
        if (contents.getType() === 'webview') {
            console.log('🌐 Webview created, session:', contents.session === require('electron').session.defaultSession ? 'default' : 'separate');
        }

        if (this.context.isDev) {
            contents.openDevTools({mode: 'detach'});
        }
    }

    private async checkPortUsage(): Promise<boolean> {
        const portInUse = await TCPPortChecker.isPortInUse(this.context.port, '127.0.0.1');

        if (!portInUse) {
            return false;
        }

        setTimeout(() => app.quit(), 1000);

        const client = new Client(this.context.port);
        client.emit('OpenApp');

        const url = this.appManager.getStartArgsUrl();
        if (url.length > 1) {
            client.emit('SetUrl', url);
        }

        if (this.appManager.getCloseAll()) {
            client.emit('CloseAll');
        }

        return true;
    }

    private configureDNS(): void {
        app.configureHostResolver({
            secureDnsMode: 'secure',
            secureDnsServers: [
                'https://dns.quad9.net/dns-query',
                'https://dns9.quad9.net/dns-query',
                'https://cloudflare-dns.com/dns-query',
            ],
        });
    }

    private async startup(): Promise<void> {
        try {
            if (await this.checkPortUsage()) {
                return;
            }

            if (this.appManager.getCloseAll()) {
                setTimeout(() => app.quit(), 1000);
                return;
            }

            this.configureDNS();

            const loaderWindow = await WindowSetup.createLoaderWindow();

            await this.appManager.performAutoUpdate();

            // Инициализируем прокси в самом начале создания окна
            await ProxyManager.initialize(this.notifyManager);

            // Ждем полной инициализации прокси и включения обработчика
            await WindowSetup.initializeProxyHandler();

            this.appManager.setupTasks();
            Extensions.protocolInject();

            const mainWindow = await WindowSetup.createMainWindow();
            this.context.window = mainWindow;

            this.setupMainWindow(mainWindow, loaderWindow);

            // Загружаем сохраненный токен после создания окна
            const authManager = AuthManager.getInstance();
            await authManager.initializeWithWindow();

            if (await this.checkPortUsage()) {
                return;
            }

            await this.appManager.startServer(this.context.port, mainWindow);
            await this.loadMainContent(mainWindow);

        } catch (error) {
            console.error('Startup failed:', error);
            app.quit();
        }
    }

    private setupMainWindow(mainWindow: BrowserWindow, loaderWindow?: BrowserWindow): void {
        mainWindow.once('ready-to-show', () => {
            setTimeout(() => {
                mainWindow.show();
                try {
                    loaderWindow?.close();
                } catch (error) {
                    console.warn('Failed to close loader window:', error);
                }
            }, 1000);
        });

        mainWindow.on('close', (e) => {
            e.preventDefault();
            mainWindow.hide();
        });

        WindowSetup.setupTray(mainWindow);
        WindowSetup.setupCors(mainWindow.webContents.session);
        WindowSetup.setupBindings(mainWindow);
    }

    private async loadMainContent(mainWindow: BrowserWindow): Promise<void> {
        await mainWindow.loadFile(join(__dirname, 'frontend/main.html'));
        const startUrl = await this.appManager.getStartUrl();
        mainWindow.webContents.send('webview:navigate', startUrl);
    }
}

const soundCloudApp = new SoundCloudApp();
soundCloudApp.initialize().catch((error) => {
    console.error('Failed to initialize app:', error);
    process.exit(1);
});