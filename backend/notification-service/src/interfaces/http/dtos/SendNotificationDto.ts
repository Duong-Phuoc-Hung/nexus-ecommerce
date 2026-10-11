export interface SendNotificationDto {
  recipientId: string;
  recipientEmail?: string;
  channel: 'EMAIL' | 'SMS' | 'PUSH' | 'IN_APP';
  title: string;
  body: string;
}
