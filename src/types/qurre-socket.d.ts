declare module 'qurre-socket' {
    export class Server {
        constructor(port: number);

        on(event: 'connection', callback: (socket: any) => void): void;

        initialize(): Promise<void>;

        close(): void;
    }

    export class Client {
        constructor(port: number);

        emit(event: string, ...args: any[]): void;
    }
}