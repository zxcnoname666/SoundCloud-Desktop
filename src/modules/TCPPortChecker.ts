import { createConnection } from 'node:net';

export class TCPPortChecker {
  static async isPortInUse(port: number, host = 'localhost'): Promise<boolean> {
    return new Promise((resolve) => {
      const connection = createConnection({ port, host });

      connection.on('connect', () => {
        connection.end();
        resolve(true);
      });

      connection.on('error', () => {
        resolve(false);
      });

      connection.setTimeout(1000, () => {
        connection.destroy();
        resolve(false);
      });
    });
  }

  static async findAvailablePort(
    startPort: number,
    endPort: number,
    host = 'localhost'
  ): Promise<number> {
    for (let port = startPort; port <= endPort; port++) {
      const inUse = await TCPPortChecker.isPortInUse(port, host);
      if (!inUse) {
        return port;
      }
    }
    throw new Error(`No available ports found between ${startPort} and ${endPort}`);
  }
}
