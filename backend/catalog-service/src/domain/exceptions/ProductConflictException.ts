export class ProductConflictException extends Error {
  public readonly code = 'CONCURRENCY_CONFLICT';
  public readonly currentUpdatedAt?: string;
  public readonly providedUpdatedAt?: string;

  constructor(
    message = 'Sản phẩm đã bị thay đổi bởi phiên làm việc khác. Vui lòng tải lại dữ liệu mới nhất trước khi chỉnh sửa.',
    currentUpdatedAt?: string,
    providedUpdatedAt?: string,
  ) {
    super(message);
    this.name = 'ProductConflictException';
    this.currentUpdatedAt = currentUpdatedAt;
    this.providedUpdatedAt = providedUpdatedAt;
  }
}
