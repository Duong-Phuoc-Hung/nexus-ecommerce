export class ChatForbiddenException extends Error {
  constructor(
    message: string = 'Bạn không có quyền truy cập hoặc thực hiện thao tác trên kênh hội thoại này.',
  ) {
    super(message);
    this.name = 'ChatForbiddenException';
  }
}
