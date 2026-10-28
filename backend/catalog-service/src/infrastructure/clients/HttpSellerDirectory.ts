export interface SellerInfo {
  id: string;
  fullName: string;
  role: string;
  status?: string;
}

export interface ISellerDirectory {
  /** Trả null nếu không có người dùng; ném lỗi nếu không tra cứu được. */
  findUser(userId: string, authorization: string): Promise<SellerInfo | null>;
}

/** Tra cứu hồ sơ qua GET /api/v1/users/:id của User Service (dùng chính token của Admin). */
export class HttpSellerDirectory implements ISellerDirectory {
  constructor(
    private readonly baseUrl = process.env.USER_SERVICE_URL ||
      `http://localhost:${process.env.USER_SERVICE_PORT || 4001}`,
  ) {}

  public async findUser(userId: string, authorization: string): Promise<SellerInfo | null> {
    const response = await fetch(`${this.baseUrl}/api/v1/users/${encodeURIComponent(userId)}`, {
      headers: { authorization },
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`User Service responded ${response.status}`);

    const body = (await response.json()) as {
      data?: { id?: string; fullName?: string; role?: string; status?: string };
    };
    const data = body.data;
    if (!data?.id) return null;
    return {
      id: String(data.id),
      fullName: data.fullName || 'Nexus Seller',
      role: String(data.role || '').toUpperCase(),
      status: data.status,
    };
  }
}
