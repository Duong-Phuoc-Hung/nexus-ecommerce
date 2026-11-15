export class ConversationNotFoundException extends Error {
  constructor(identifier: string) {
    super(`Không tìm thấy phiên hội thoại với mã "${identifier}".`);
    this.name = 'ConversationNotFoundException';
  }
}
