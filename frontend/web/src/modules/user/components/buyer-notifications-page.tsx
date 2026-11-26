'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CheckCircle2,
  Gavel,
  Package,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { requestApi } from '@/lib/axios/api-client';
import { unwrap, userMessage } from '@/lib/axios/http';
import { useSession } from '@/modules/auth/hooks/use-session';

type NotificationCategory = 'ORDER' | 'AUCTION' | 'ACCOUNT';

type BuyerNotification = {
  id: string;
  category: NotificationCategory;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
  href?: string;
};

type NotificationPreferences = {
  orderEmail: boolean;
  orderPush: boolean;
  auctionEmail: boolean;
  auctionPush: boolean;
  accountEmail: boolean;
  accountPush: boolean;
};

const DEFAULT_PREFS: NotificationPreferences = {
  orderEmail: true,
  orderPush: true,
  auctionEmail: true,
  auctionPush: true,
  accountEmail: true,
  accountPush: true,
};

function prefsStorageKey(userId: string) {
  return `nexus.notification.prefs.v1:${userId}`;
}

function readLocalPrefs(userId: string): NotificationPreferences {
  if (typeof window === 'undefined' || !userId) return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(prefsStorageKey(userId));
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw), orderEmail: true, orderPush: true };
  } catch {
    return DEFAULT_PREFS;
  }
}

function writeLocalPrefs(userId: string, prefs: NotificationPreferences) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    window.localStorage.setItem(prefsStorageKey(userId), JSON.stringify(prefs));
  } catch {
    // Ignore storage quota error
  }
}

function mapNotificationRow(raw: unknown, idx: number): BuyerNotification {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const payload =
    row.data && typeof row.data === 'object' ? (row.data as Record<string, unknown>) : {};
  const rawType = String(
    row.category ?? row.type ?? row.eventType ?? row.channel ?? 'ACCOUNT',
  ).toUpperCase();
  const category: NotificationCategory =
    rawType.includes('AUCTION') || rawType.includes('BID')
      ? 'AUCTION'
      : rawType.includes('ORDER') ||
          rawType.includes('PAYMENT') ||
          rawType.includes('SHIP') ||
          rawType.includes('DISPUTE')
        ? 'ORDER'
        : 'ACCOUNT';

  const orderId =
    typeof row.orderId === 'string'
      ? row.orderId
      : typeof payload.orderId === 'string'
        ? payload.orderId
        : '';
  const auctionId =
    typeof row.auctionId === 'string'
      ? row.auctionId
      : typeof payload.auctionId === 'string'
        ? payload.auctionId
        : '';
  const href =
    typeof row.href === 'string'
      ? row.href
      : orderId
        ? `/account/orders/${encodeURIComponent(orderId)}`
        : auctionId
          ? `/auctions/${encodeURIComponent(auctionId)}`
          : undefined;

  return {
    id: String(row.id ?? `notif-${idx}`),
    category,
    title: String(row.title ?? row.subject ?? 'Thông báo từ Nexus'),
    message: String(row.message ?? row.body ?? row.content ?? ''),
    createdAt: String(row.createdAt ?? row.timestamp ?? new Date().toISOString()),
    read: Boolean(row.read ?? row.isRead ?? row.readAt),
    href,
  };
}

export function BuyerNotificationsPage() {
  const { user, phase } = useSession();
  const [tab, setTab] = useState<'history' | 'preferences'>('history');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | NotificationCategory>('ALL');

  const [items, setItems] = useState<BuyerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [markingAll, setMarkingAll] = useState(false);

  const [prefs, setPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsNotice, setPrefsNotice] = useState('');
  const [prefsError, setPrefsError] = useState('');

  const loadNotifications = useCallback(async () => {
    if (!user?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const raw = await requestApi('/notifications');
      const unwrapped = unwrap<unknown>(raw);
      const list = Array.isArray(unwrapped)
        ? unwrapped
        : Array.isArray((unwrapped as Record<string, unknown>)?.items)
          ? ((unwrapped as Record<string, unknown>).items as unknown[])
          : [];
      setItems(list.map(mapNotificationRow));
    } catch (err) {
      setItems([]);
      setError(userMessage(err) || 'Không thể tải danh sách thông báo.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (phase !== 'ready') return;
    if (!user?.id) {
      setItems([]);
      setPrefs(DEFAULT_PREFS);
      setLoading(false);
      return;
    }
    setPrefs(readLocalPrefs(user.id));
    void loadNotifications();

    requestApi('/notifications/preferences')
      .then((raw) => {
        const data = unwrap<Partial<NotificationPreferences>>(raw);
        if (data && typeof data === 'object') {
          const merged = { ...DEFAULT_PREFS, ...data, orderEmail: true, orderPush: true };
          setPrefs(merged);
          writeLocalPrefs(user.id, merged);
        }
      })
      .catch(() => {
        // Dùng cấu hình đã lưu theo tài khoản
      });
  }, [loadNotifications, phase, user?.id]);

  const filteredItems = useMemo(() => {
    if (categoryFilter === 'ALL') return items;
    return items.filter((item) => item.category === categoryFilter);
  }, [categoryFilter, items]);

  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);

  async function markOneRead(notificationId: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === notificationId ? { ...item, read: true } : item)),
    );
    try {
      await requestApi(`/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: 'PATCH',
      });
    } catch {
      // Keep UI responsive; next reload will reconcile with server state
    }
  }

  async function markAllRead() {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await requestApi('/notifications/read-all', { method: 'POST' });
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    } catch (err) {
      setError(userMessage(err) || 'Không thể đánh dấu tất cả thông báo đã đọc.');
    } finally {
      setMarkingAll(false);
    }
  }

  async function savePreferences() {
    if (!user?.id || savingPrefs) return;
    setSavingPrefs(true);
    setPrefsNotice('');
    setPrefsError('');
    const nextPrefs: NotificationPreferences = {
      ...prefs,
      orderEmail: true,
      orderPush: true,
    };
    try {
      await requestApi('/notifications/preferences', {
        method: 'PUT',
        body: nextPrefs,
      });
      writeLocalPrefs(user.id, nextPrefs);
      setPrefsNotice('Đã lưu tùy chọn thông báo.');
    } catch (err) {
      setPrefsError(userMessage(err) || 'Không thể lưu tùy chọn thông báo.');
    } finally {
      setSavingPrefs(false);
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="nexus-container py-8 sm:py-10">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/account"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-950"
            >
              <ArrowLeft className="size-4" aria-hidden="true" />
              Tài khoản
            </Link>
            {user && tab === 'history' && (
              <div className="flex flex-wrap items-center gap-2">
                {unreadCount > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void markAllRead()}
                    disabled={markingAll || loading}
                    className="min-h-11 rounded-xl border-stone-300"
                  >
                    <CheckCircle2 className="size-4" aria-hidden="true" />
                    {markingAll ? 'Đang xử lý…' : `Đánh dấu tất cả đã đọc (${unreadCount})`}
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void loadNotifications()}
                  disabled={loading}
                  className="min-h-11 rounded-xl border-stone-300"
                >
                  <RefreshCw
                    className={`size-4 ${loading ? 'motion-safe:animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  Làm mới
                </Button>
              </div>
            )}
          </div>

          <header>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-dark">
              Tài khoản Nexus
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
              Thông báo
            </h1>
          </header>

          {phase === 'loading' ? (
            <p
              role="status"
              className="rounded-2xl border border-line bg-white p-8 text-sm text-muted"
            >
              Đang xác minh phiên đăng nhập…
            </p>
          ) : !user ? (
            <section className="rounded-3xl border border-line bg-white p-8 text-center">
              <Bell className="mx-auto size-9 text-stone-400" aria-hidden="true" />
              <p className="mt-3 text-sm text-muted">
                Đăng nhập để xem lịch sử thông báo và thiết lập kênh nhận tin.
              </p>
              <Button asChild className="mt-5 min-h-11 rounded-xl bg-brand-dark px-6 text-white">
                <Link href="/login?next=%2Faccount%2Fnotifications">Đăng nhập</Link>
              </Button>
            </section>
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Mục thông báo"
                className="flex flex-wrap gap-2 border-b border-line pb-3"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'history'}
                  onClick={() => setTab('history')}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                    tab === 'history'
                      ? 'bg-stone-900 text-white'
                      : 'border border-line bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <Bell className="size-4" aria-hidden="true" />
                  Lịch sử thông báo
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'preferences'}
                  onClick={() => setTab('preferences')}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                    tab === 'preferences'
                      ? 'bg-stone-900 text-white'
                      : 'border border-line bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Tùy chọn nhận tin
                </button>
              </div>

              {tab === 'history' ? (
                <section className="space-y-4">
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label="Lọc loại thông báo"
                  >
                    {(
                      [
                        ['ALL', 'Tất cả'],
                        ['ORDER', 'Đơn hàng'],
                        ['AUCTION', 'Đấu giá'],
                        ['ACCOUNT', 'Tài khoản'],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        aria-pressed={categoryFilter === key}
                        onClick={() => setCategoryFilter(key)}
                        className={`min-h-10 rounded-full px-4 text-xs font-semibold transition ${
                          categoryFilter === key
                            ? 'bg-brand-dark text-white'
                            : 'border border-line bg-white text-stone-600 hover:bg-stone-50'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {error && (
                    <p role="alert" className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
                      {error}
                    </p>
                  )}

                  {loading ? (
                    <div
                      role="status"
                      className="rounded-2xl border border-line bg-white p-10 text-center text-sm text-muted"
                    >
                      Đang tải thông báo…
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="rounded-3xl border border-line bg-white px-6 py-14 text-center">
                      <Bell className="mx-auto size-8 text-stone-300" aria-hidden="true" />
                      <h2 className="mt-3 text-base font-semibold text-stone-900">
                        Chưa có thông báo mới
                      </h2>
                      <p className="mt-1 text-sm text-muted">
                        Cập nhật về đơn hàng, vượt giá đấu giá và tài khoản sẽ xuất hiện tại đây.
                      </p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-white">
                      {filteredItems.map((item) => (
                        <li
                          key={item.id}
                          className={`flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between ${
                            !item.read ? 'bg-brand-soft/20' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3.5">
                            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-stone-100 text-stone-700">
                              {item.category === 'AUCTION' ? (
                                <Gavel className="size-4 text-emerald-700" aria-hidden="true" />
                              ) : item.category === 'ORDER' ? (
                                <Package className="size-4 text-brand-dark" aria-hidden="true" />
                              ) : (
                                <ShieldCheck className="size-4 text-stone-700" aria-hidden="true" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                {!item.read && (
                                  <span
                                    aria-label="Chưa đọc"
                                    className="size-2 shrink-0 rounded-full bg-brand"
                                  />
                                )}
                                <p className="text-sm font-semibold text-stone-950">{item.title}</p>
                              </div>
                              {item.message && (
                                <p className="mt-1 text-sm text-stone-600">{item.message}</p>
                              )}
                              <p className="mt-1.5 text-xs text-muted tabular-nums">
                                {Number.isFinite(Date.parse(item.createdAt))
                                  ? new Date(item.createdAt).toLocaleString('vi-VN')
                                  : item.createdAt}
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            {!item.read && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void markOneRead(item.id)}
                                className="min-h-10 rounded-xl text-xs text-stone-600 hover:text-stone-950"
                              >
                                Đánh dấu đã đọc
                              </Button>
                            )}
                            {item.href && (
                              <Button
                                asChild
                                variant="outline"
                                size="sm"
                                className="min-h-10 shrink-0 rounded-xl"
                              >
                                <Link
                                  href={item.href}
                                  onClick={() => {
                                    if (!item.read) void markOneRead(item.id);
                                  }}
                                >
                                  Mở chi tiết
                                  <ArrowUpRight className="size-3.5" aria-hidden="true" />
                                </Link>
                              </Button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : (
                <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                  <div className="space-y-6">
                    {[
                      {
                        title: 'Đơn hàng & thanh toán',
                        description: 'Xác nhận đơn, vận chuyển và kết quả hoàn tiền (bắt buộc).',
                        emailKey: 'orderEmail' as const,
                        pushKey: 'orderPush' as const,
                        locked: true,
                      },
                      {
                        title: 'Đấu giá & vượt giá',
                        description: 'Thông báo khi bị vượt giá, gia hạn phiên hoặc thắng phiên.',
                        emailKey: 'auctionEmail' as const,
                        pushKey: 'auctionPush' as const,
                        locked: false,
                      },
                      {
                        title: 'Cập nhật tài khoản',
                        description: 'Thay đổi bảo mật, hồ sơ và trạng thái đăng ký bán hàng.',
                        emailKey: 'accountEmail' as const,
                        pushKey: 'accountPush' as const,
                        locked: false,
                      },
                    ].map((group) => (
                      <div
                        key={group.title}
                        className="flex flex-col gap-4 border-b border-line pb-5 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="text-sm font-semibold text-stone-950">{group.title}</p>
                          <p className="mt-1 text-xs text-muted">{group.description}</p>
                        </div>
                        <div className="flex items-center gap-5 text-sm">
                          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={prefs[group.emailKey]}
                              disabled={group.locked}
                              onChange={(e) =>
                                setPrefs((p) => ({ ...p, [group.emailKey]: e.target.checked }))
                              }
                              className="size-4 accent-emerald-700"
                            />
                            <span>Email</span>
                          </label>
                          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2">
                            <input
                              type="checkbox"
                              checked={prefs[group.pushKey]}
                              disabled={group.locked}
                              onChange={(e) =>
                                setPrefs((p) => ({ ...p, [group.pushKey]: e.target.checked }))
                              }
                              className="size-4 accent-emerald-700"
                            />
                            <span>Trên web</span>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>

                  {prefsNotice && (
                    <p
                      role="status"
                      className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 p-3.5 text-sm text-emerald-900"
                    >
                      <CheckCircle2 className="size-4 shrink-0" aria-hidden="true" />
                      {prefsNotice}
                    </p>
                  )}
                  {prefsError && (
                    <p
                      role="alert"
                      className="mt-5 rounded-xl bg-red-50 p-3.5 text-sm text-red-700"
                    >
                      {prefsError}
                    </p>
                  )}

                  <div className="mt-6 flex justify-end">
                    <Button
                      type="button"
                      disabled={savingPrefs}
                      onClick={() => void savePreferences()}
                      className="min-h-11 rounded-xl bg-brand-dark px-6 text-white"
                    >
                      {savingPrefs ? 'Đang lưu…' : 'Lưu tùy chọn'}
                    </Button>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}
