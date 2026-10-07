export class NotificationNotFoundException extends Error {
  constructor(id: string) {
    super(`Notification with ID "${id}" was not found.`);
    this.name = 'NotificationNotFoundException';
  }
}
