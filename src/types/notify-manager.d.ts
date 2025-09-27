declare module 'notify-manager-electron' {
    export interface NotificationOptions {
        title: string;
        body: string;
        icon?: string;
    }

    export class NotifyManager {
        constructor();

        showNotification(options: NotificationOptions): void;

        getWindow(): any;
    }

    export class Notify {
        constructor(manager: NotifyManager);

        show(options: NotificationOptions): void;
    }
}