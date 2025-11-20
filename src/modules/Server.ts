import { type BrowserWindow, app } from 'electron';
import { Server as SocketServer } from 'qurre-socket';

export class Server {
  private server: SocketServer | null = null;

  async start(port: number, window: BrowserWindow): Promise<void> {
    this.server = new SocketServer(port);

    this.server.on('connection', (socket) => {
      this.setupSocketHandlers(socket, window);
    });

    try {
      await this.server.initialize();
      console.info(`✅ Server started on port ${port}`);
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      throw error;
    }
  }

  stop(): void {
    if (this.server) {
      try {
        this.server.close();
        console.info('🛑 Server stopped');
      } catch (error) {
        console.error('❌ Failed to stop server:', error);
      }
    }
  }

  private setupSocketHandlers(socket: any, window: BrowserWindow): void {
    socket.on('OpenApp', () => {
      window.show();
      window.focus();
    });

    socket.on('CloseAll', () => {
      app.exit(0);
    });

    socket.on('SetUrl', ([url]: [string]) => {
      try {
        const cleanUrl = url.replace('sc://', '');
        const fullUrl = `https://soundcloud.com/${cleanUrl}`;

        this.updateUrl(window, fullUrl, cleanUrl);
        window.show();
        window.focus();
      } catch (error) {
        console.error('❌ Failed to set URL:', error);
      }
    });
  }

  private updateUrl(window: BrowserWindow, fullUrl: string, shortUrl: string): void {
    try {
      window.webContents.send('webview:url-changed', shortUrl);
      console.info(`🔗 Updated URL to: ${fullUrl}`);
    } catch (error) {
      console.error('❌ Failed to update URL:', error);
    }
  }
}
