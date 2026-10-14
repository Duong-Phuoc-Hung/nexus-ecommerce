export interface TokenStorage {
  get(): string | null;
  set(token: string): void;
  clear(): void;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const browserTokenStorage: TokenStorage = {
  get: () =>
    typeof window === 'undefined' ? null : window.sessionStorage.getItem('nexus.accessToken'),
  set: (token) => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem('nexus.accessToken', token);
  },
  clear: () => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem('nexus.accessToken');
  },
};

export class ApiClient {
  constructor(
    private readonly baseUrl = 'http://localhost:4000/api/v1',
    private readonly tokenStorage: TokenStorage = browserTokenStorage,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  public setToken(token: string): void {
    this.tokenStorage.set(token);
  }

  public clearToken(): void {
    this.tokenStorage.clear();
  }

  public async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    const token = this.tokenStorage.get();
    if (token && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${token}`);
    }
    if (init.body && !headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }

    const response = await this.fetcher(
      `${this.baseUrl.replace(/\/$/, '')}/${path.replace(/^\//, '')}`,
      { ...init, headers },
    );
    const contentType = response.headers.get('content-type') ?? '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      if (response.status === 401) this.tokenStorage.clear();
      const message =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? String(payload.error)
          : `Request failed with status ${response.status}.`;
      throw new ApiError(message, response.status);
    }

    return payload as T;
  }
}
