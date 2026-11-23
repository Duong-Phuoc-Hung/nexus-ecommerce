'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Eye,
  Gavel,
  Globe2,
  Lock,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import {
  auctionApi,
  canManageAuction,
  validateAuction,
  type AuctionInput,
  type AuctionProductOption,
  type AuctionVisibility,
} from '@/modules/auction/api/auction.api';
import {
  AuctionBadge,
  auctionDateWithTz,
  auctionMoney,
  getDisplayTimezoneLabel,
} from '@/modules/auction/components/auction-ui';
import { useAuctions } from '@/modules/auction/hooks/use-auctions';

function localDate(time: number) {
  const d = new Date(time);
  return new Date(time - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export function AuctionForm({ id }: { id?: string }) {
  const router = useRouter();
  const { rows: auctions } = useAuctions();
  const { user } = useSession();

  const [baseline, setBaseline] = useState('');
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const committed = useRef(false);

  const [products, setProducts] = useState<AuctionProductOption[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>('all');
  const [productId, setProductId] = useState('');
  const [price, setPrice] = useState('');
  const [increment, setIncrement] = useState('');
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [visibility, setVisibility] = useState<AuctionVisibility>('PUBLIC');
  const [version, setVersion] = useState<number>();
  const [initialStartAt, setInitialStartAt] = useState<number | null>(null);
  const [startedWhileEditing, setStartedWhileEditing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<AuctionInput | null>(null);

  const tzLabel = useMemo(() => getDisplayTimezoneLabel(), []);

  const hasPermission = canManageAuction(user, id ? 'AUCTION.UPDATE' : 'AUCTION.CREATE');
  const canSave = hasPermission && !startedWhileEditing;

  const fingerprint = JSON.stringify([
    productId,
    price,
    increment,
    buyNowPrice,
    start,
    end,
    visibility,
  ]);
  const dirty = !loading && !!baseline && baseline !== fingerprint;

  const reserved = useMemo(
    () =>
      new Set(
        auctions
          .filter((a) => a.id !== id && ['SCHEDULED', 'ACTIVE', 'EXTENDED'].includes(a.status))
          .map((a) => a.productId),
      ),
    [auctions, id],
  );

  const sellers = useMemo(() => {
    const names = Array.from(new Set(products.map((p) => p.seller).filter(Boolean)));
    return names.sort((a, b) => a.localeCompare(b, 'vi'));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedSeller === 'all') return products;
    return products.filter((p) => p.seller === selectedSeller);
  }, [products, selectedSeller]);

  // Warn if leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      if (!committed.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    const navigate = (e: MouseEvent) => {
      if (
        committed.current ||
        e.defaultPrevented ||
        e.button !== 0 ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const anchor = (e.target as Element).closest?.('a[href]') as HTMLAnchorElement | null;
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) return;
      const url = new URL(anchor.href);
      if (
        url.origin !== location.origin ||
        url.pathname + url.search === location.pathname + location.search
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      setLeaveTo(url.pathname + url.search + url.hash);
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', navigate, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', navigate, true);
    };
  }, [dirty]);

  // Monitor whether a SCHEDULED auction starts while the edit form is open (A3 spec)
  useEffect(() => {
    if (!id || !initialStartAt || startedWhileEditing) return;
    const check = () => {
      if (Date.now() >= initialStartAt) {
        setStartedWhileEditing(true);
        setPending(null);
      }
    };
    check();
    const timer = window.setInterval(check, 2000);
    return () => window.clearInterval(timer);
  }, [id, initialStartAt, startedWhileEditing]);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const list = await auctionApi.products();
        if (!alive) return;
        setProducts(list);

        if (id) {
          const { auction } = await auctionApi.detail(id);
          if (!alive) return;
          if (auction.status !== 'SCHEDULED') {
            setBlocked(true);
            setError('Chỉ có thể sửa cấu hình cho phiên chưa bắt đầu (SCHEDULED).');
            setProductId(auction.productId);
            setSelectedSeller(auction.seller || 'all');
            setPrice(String(auction.startingPrice));
            setIncrement(String(auction.increment));
            setBuyNowPrice(auction.buyNowPrice ? String(auction.buyNowPrice) : '');
            setStart(localDate(auction.startAt));
            setEnd(localDate(auction.endAt));
            setVisibility(auction.visibility ?? 'PUBLIC');
            return;
          }
          const initialStartStr = localDate(auction.startAt);
          const initialEndStr = localDate(auction.endAt);
          const buyNowStr = auction.buyNowPrice ? String(auction.buyNowPrice) : '';
          const vis = auction.visibility ?? 'PUBLIC';

          setSelectedSeller(auction.seller || 'all');
          setProductId(auction.productId);
          setPrice(String(auction.startingPrice));
          setIncrement(String(auction.increment));
          setBuyNowPrice(buyNowStr);
          setStart(initialStartStr);
          setEnd(initialEndStr);
          setVisibility(vis);
          setVersion(auction.version);
          setInitialStartAt(auction.startAt);
          setBaseline(
            JSON.stringify([
              auction.productId,
              String(auction.startingPrice),
              String(auction.increment),
              buyNowStr,
              initialStartStr,
              initialEndStr,
              vis,
            ]),
          );
        } else {
          const initialStart = localDate(Date.now() + 86_400_000);
          const initialEnd = localDate(Date.now() + 172_800_000);
          setStart(initialStart);
          setEnd(initialEnd);
          setBaseline(JSON.stringify(['', '', '', '', initialStart, initialEnd, 'PUBLIC']));
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Không tải được dữ liệu thiết lập phiên.');
          setBlocked(true);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => {
      alive = false;
    };
  }, [id]);

  const product = products.find((p) => p.id === productId);
  const parsedStart = start ? new Date(start).getTime() : NaN;
  const parsedEnd = end ? new Date(end).getTime() : NaN;

  function review(e: FormEvent) {
    e.preventDefault();
    if (!canSave || blocked || busy) return;
    if (id && initialStartAt && Date.now() >= initialStartAt) {
      setStartedWhileEditing(true);
      return;
    }

    const errors: Record<string, string> = {};
    const parsedBuyNow = buyNowPrice.trim() ? Number(buyNowPrice) : null;
    const input: AuctionInput = {
      productId,
      sellerId: product?.sellerId || undefined,
      title: product?.name,
      startingPrice: Number(price),
      increment: Number(increment),
      buyNowPrice: parsedBuyNow,
      visibility,
      startAt: new Date(start).getTime(),
      endAt: new Date(end).getTime(),
    };

    if (!productId) errors.product = 'Chọn sản phẩm hợp lệ cho phiên đấu.';
    else if (reserved.has(productId))
      errors.product = 'Sản phẩm đang có phiên sắp mở hoặc đang chạy. Hãy chọn sản phẩm khác.';

    if (
      !Number.isSafeInteger(input.startingPrice) ||
      input.startingPrice <= 0 ||
      input.startingPrice > 1e12
    )
      errors.price = 'Nhập số nguyên VND dương, tối đa 1.000 tỷ.';

    if (!Number.isSafeInteger(input.increment) || input.increment <= 0 || input.increment > 1e12)
      errors.increment = 'Nhập bước giá nguyên dương, tối đa 1.000 tỷ.';

    if (
      parsedBuyNow !== null &&
      (!Number.isSafeInteger(parsedBuyNow) ||
        parsedBuyNow <= input.startingPrice ||
        parsedBuyNow > 1e12)
    ) {
      errors.buyNowPrice = 'Giá mua ngay phải là số nguyên lớn hơn giá khởi điểm.';
    }

    if (!Number.isFinite(input.startAt) || input.startAt <= Date.now())
      errors.start = 'Thời gian bắt đầu phải ở tương lai.';

    const duration = input.endAt - input.startAt;
    if (!Number.isFinite(duration) || duration < 3_600_000 || duration > 168 * 3_600_000)
      errors.end = 'Thời lượng phiên phải từ 1 giờ đến 7 ngày.';

    setFields(errors);
    setError('');
    if (Object.keys(errors).length) {
      const key = Object.keys(errors)[0];
      document.getElementById(key === 'product' ? 'auction-product' : key)?.focus();
      return;
    }

    try {
      validateAuction(input);
      setPending(input);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function save() {
    if (!pending || !user || busy || !canSave) return;
    setBusy(true);
    try {
      const row = await auctionApi.save(pending, id, version, user);
      committed.current = true;
      router.push('/admin/auctions/' + encodeURIComponent(row.id));
    } catch (e) {
      setPending(null);
      setError(
        e instanceof Error
          ? e.message
          : 'Không lưu được phiên. Dữ liệu vừa nhập vẫn được giữ nguyên.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" asChild className="min-h-11 rounded-xl">
          <Link href={id ? `/admin/auctions/${encodeURIComponent(id)}` : '/admin/auctions'}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại phiên đấu
          </Link>
        </Button>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium text-stone-600">
          <CalendarClock className="size-3.5 text-emerald-700" aria-hidden="true" />
          Múi giờ nhập lịch: {tzLabel}
        </span>
      </div>

      <header>
        <p className="mb-1.5 text-xs font-bold tracking-[0.18em] text-emerald-800 uppercase">
          Chuẩn bị phiên đấu giá
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-stone-950 sm:text-3xl">
          {id ? 'Chỉnh sửa phiên đấu giá' : 'Tạo phiên đấu giá mới'}
        </h1>
        <p className="mt-1.5 text-sm text-stone-600">
          Chọn Seller và sản phẩm hợp lệ, thiết lập giá, lịch mở/đóng theo đúng múi giờ và đối chiếu
          bản xem trước phía Buyer trước khi xác nhận.
        </p>
      </header>

      {appConfig.auctionSource !== 'mock' && id && (
        <div
          role="status"
          className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <p>
            API cập nhật phiên (<code>PUT /api/v1/auctions/:id</code>) hiện hỗ trợ đổi tiêu đề, bước
            giá, giá mua ngay và lịch mở/đóng; giá khởi điểm giữ nguyên theo lúc tạo cho tới khi
            Backend bổ sung chỉnh sửa <code>startingPrice</code>.
          </p>
        </div>
      )}

      {startedWhileEditing && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <div>
              <p className="font-semibold">Phiên đã bắt đầu trong lúc bạn đang chỉnh sửa</p>
              <p className="mt-0.5 text-xs text-red-800">
                Hệ thống đã chặn lưu để bảo toàn luật phiên. Toàn bộ giá trị bạn vừa nhập vẫn được
                giữ lại bên dưới để đối chiếu.
              </p>
            </div>
          </div>
          {id && (
            <Button
              asChild
              variant="outline"
              className="min-h-10 rounded-xl border-red-300 bg-white text-xs text-red-900"
            >
              <Link href={`/admin/auctions/${encodeURIComponent(id)}`}>Quay lại hồ sơ phiên</Link>
            </Button>
          )}
        </div>
      )}

      {!hasPermission && (
        <p
          role="status"
          className="rounded-2xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600"
        >
          Bạn có quyền xem nhưng chưa có quyền tạo hoặc chỉnh sửa cấu hình phiên đấu.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}

      {loading ? (
        <p
          role="status"
          className="rounded-2xl border border-stone-200 bg-white p-8 text-sm text-stone-600"
        >
          Đang tải danh sách sản phẩm và cấu hình phiên…
        </p>
      ) : (
        <form
          onSubmit={review}
          noValidate
          className="grid items-start gap-6 xl:grid-cols-[1.65fr_1fr]"
        >
          <div className="space-y-6">
            <fieldset disabled={busy || blocked || !canSave} className="space-y-6">
              {/* Step 1: Seller & valid product */}
              <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-3 text-base font-semibold text-stone-950">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                    01
                  </span>
                  Seller và sản phẩm hợp lệ
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="auction-seller"
                      className="mb-2 block text-sm font-semibold text-stone-900"
                    >
                      Seller sở hữu
                    </label>
                    <Select
                      value={selectedSeller}
                      onValueChange={(value) => {
                        setSelectedSeller(value);
                        if (value !== 'all' && product && product.seller !== value) {
                          setProductId('');
                        }
                      }}
                      disabled={!!id || busy || blocked || !canSave}
                    >
                      <SelectTrigger id="auction-seller" className="min-h-11 w-full rounded-xl">
                        <SelectValue placeholder="Tất cả Seller…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tất cả Seller ({sellers.length})</SelectItem>
                        {sellers.map((sellerName) => (
                          <SelectItem key={sellerName} value={sellerName}>
                            {sellerName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label
                      htmlFor="auction-product"
                      className="mb-2 block text-sm font-semibold text-stone-900"
                    >
                      Sản phẩm tham gia <span className="text-red-600">*</span>
                    </label>
                    <Select
                      value={productId}
                      onValueChange={(value) => {
                        setProductId(value);
                        const chosen = products.find((p) => p.id === value);
                        if (chosen) setSelectedSeller(chosen.seller);
                      }}
                      disabled={!!id || busy || blocked || !canSave}
                    >
                      <SelectTrigger
                        id="auction-product"
                        className="min-h-11 w-full rounded-xl"
                        aria-invalid={!!fields.product}
                        aria-describedby="product-error"
                      >
                        <SelectValue placeholder="Chọn sản phẩm…" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredProducts.map((p) => (
                          <SelectItem key={p.id} value={p.id} disabled={reserved.has(p.id)}>
                            {p.name}
                            {reserved.has(p.id) ? ' · Đang có phiên mở' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p id="product-error" className="mt-1.5 text-xs text-red-700">
                      {fields.product}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-stone-500">
                  Mỗi sản phẩm chỉ được gắn tối đa một phiên đang lên lịch, đang mở hoặc đang gia
                  hạn.
                </p>
              </section>

              {/* Step 2: Pricing & optional Buy Now */}
              <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-3 text-base font-semibold text-stone-950">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                    02
                  </span>
                  Giá khởi điểm, bước giá và giá mua ngay
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  <div>
                    <label
                      htmlFor="price"
                      className="mb-2 block text-sm font-semibold text-stone-900"
                    >
                      Giá khởi điểm (VND) <span className="text-red-600">*</span>
                    </label>
                    <Input
                      id="price"
                      type="number"
                      min={1}
                      max={1e12}
                      step={1}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      aria-invalid={!!fields.price}
                      aria-describedby="price-error"
                      className="min-h-11 rounded-xl tabular-nums"
                    />
                    <p id="price-error" className="mt-1.5 text-xs text-red-700">
                      {fields.price}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="increment"
                      className="mb-2 block text-sm font-semibold text-stone-900"
                    >
                      Bước giá tối thiểu (VND) <span className="text-red-600">*</span>
                    </label>
                    <Input
                      id="increment"
                      type="number"
                      min={1}
                      max={1e12}
                      step={1}
                      value={increment}
                      onChange={(e) => setIncrement(e.target.value)}
                      aria-invalid={!!fields.increment}
                      aria-describedby="increment-error"
                      className="min-h-11 rounded-xl tabular-nums"
                    />
                    <p id="increment-error" className="mt-1.5 text-xs text-red-700">
                      {fields.increment}
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="buyNowPrice"
                      className="mb-2 block text-sm font-semibold text-stone-900"
                    >
                      Giá mua ngay (tùy chọn)
                    </label>
                    <Input
                      id="buyNowPrice"
                      type="number"
                      min={1}
                      max={1e12}
                      step={1}
                      placeholder="Bỏ trống nếu không bật"
                      value={buyNowPrice}
                      onChange={(e) => setBuyNowPrice(e.target.value)}
                      aria-invalid={!!fields.buyNowPrice}
                      aria-describedby="buyNowPrice-error"
                      className="min-h-11 rounded-xl tabular-nums"
                    />
                    <p id="buyNowPrice-error" className="mt-1.5 text-xs text-red-700">
                      {fields.buyNowPrice}
                    </p>
                  </div>
                </div>
              </section>

              {/* Step 3: Schedule with explicit timezone beside inputs + visibility */}
              <section className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
                <h2 className="flex items-center gap-3 text-base font-semibold text-stone-950">
                  <span className="inline-flex size-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-bold text-emerald-800">
                    03
                  </span>
                  Lịch mở / đóng và phạm vi truy cập
                </h2>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor="start" className="text-sm font-semibold text-stone-900">
                        Giờ mở phiên <span className="text-red-600">*</span>
                      </label>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                        {tzLabel}
                      </span>
                    </div>
                    <Input
                      id="start"
                      type="datetime-local"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      aria-invalid={!!fields.start}
                      aria-describedby="start-error"
                      className="min-h-11 rounded-xl tabular-nums"
                    />
                    <p id="start-error" className="mt-1.5 text-xs text-red-700">
                      {fields.start}
                    </p>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label htmlFor="end" className="text-sm font-semibold text-stone-900">
                        Giờ đóng phiên <span className="text-red-600">*</span>
                      </label>
                      <span className="rounded-md bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                        {tzLabel}
                      </span>
                    </div>
                    <Input
                      id="end"
                      type="datetime-local"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      aria-invalid={!!fields.end}
                      aria-describedby="end-error"
                      className="min-h-11 rounded-xl tabular-nums"
                    />
                    <p id="end-error" className="mt-1.5 text-xs text-red-700">
                      {fields.end}
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-stone-100 pt-5">
                  <span className="mb-2.5 block text-sm font-semibold text-stone-900">
                    Phạm vi truy cập
                  </span>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      aria-pressed={visibility === 'PUBLIC'}
                      onClick={() => setVisibility('PUBLIC')}
                      className={
                        'flex min-h-14 items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ' +
                        (visibility === 'PUBLIC'
                          ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')
                      }
                    >
                      <Globe2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold">Công khai</p>
                        <p className="text-xs text-stone-600">
                          Hiển thị trên danh sách công khai; khách xem được giá, Buyer đăng nhập để
                          đặt giá.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      aria-pressed={visibility === 'RESTRICTED'}
                      onClick={() => setVisibility('RESTRICTED')}
                      className={
                        'flex min-h-14 items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ' +
                        (visibility === 'RESTRICTED'
                          ? 'border-emerald-700 bg-emerald-50/70 text-emerald-950'
                          : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300')
                      }
                    >
                      <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      <div>
                        <p className="text-sm font-semibold">Hạn chế</p>
                        <p className="text-xs text-stone-600">
                          Chỉ người dùng được cấp quyền truy cập mới nhìn thấy trong danh sách và
                          chi tiết.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                <p className="mt-4 text-xs text-stone-500">
                  Thời lượng phiên hợp lệ từ 1 giờ đến 7 ngày. Luật gia hạn chống sniping mặc định:
                  cộng 5 phút nếu có lượt hợp lệ trong 5 phút cuối (tối đa 5 lần).
                </p>
              </section>
            </fieldset>

            <div className="flex flex-wrap justify-end gap-3">
              <Button asChild variant="outline" className="min-h-11 rounded-xl border-stone-300">
                <Link href={id ? `/admin/auctions/${encodeURIComponent(id)}` : '/admin/auctions'}>
                  Hủy thay đổi
                </Link>
              </Button>
              <Button
                type="submit"
                disabled={busy || blocked || !canSave}
                className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
              >
                <CheckCircle2 className="size-4" aria-hidden="true" />
                Kiểm tra và lưu
              </Button>
            </div>
          </div>

          {/* Step 4: Buyer display preview aside */}
          <aside className="overflow-hidden rounded-2xl border border-stone-200 bg-white xl:sticky xl:top-6">
            <div className="flex items-center justify-between border-b border-stone-100 bg-stone-50 px-5 py-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-stone-700 uppercase">
                <Eye className="size-3.5 text-emerald-700" aria-hidden="true" />
                04 · Xem trước phía Buyer
              </span>
              <AuctionBadge status="SCHEDULED" />
            </div>

            {product ? (
              <img
                src={product.image}
                alt={product.name}
                className="aspect-[4/3] w-full bg-stone-50 object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-stone-100">
                <Gavel className="size-10 text-stone-300" aria-hidden="true" />
              </div>
            )}

            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs text-stone-500">
                  {product?.seller || 'Chưa chọn Seller'} ·{' '}
                  {visibility === 'RESTRICTED' ? 'Phiên hạn chế' : 'Phiên công khai'}
                </p>
                <h3 className="mt-1 text-lg font-bold text-stone-950">
                  {product?.name || 'Chọn sản phẩm để xem trước hiển thị'}
                </h3>
              </div>

              <div className="space-y-2 border-y border-stone-100 py-4 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-stone-500">Giá khởi điểm</span>
                  <strong className="text-xl font-bold text-stone-950 tabular-nums">
                    {auctionMoney(Number(price) || 0)}
                  </strong>
                </div>
                <div className="flex items-baseline justify-between text-xs">
                  <span className="text-stone-500">Bước giá tối thiểu</span>
                  <span className="font-semibold text-stone-800 tabular-nums">
                    +{auctionMoney(Number(increment) || 0)}
                  </span>
                </div>
                {Number(buyNowPrice) > 0 && (
                  <div className="flex items-baseline justify-between text-xs">
                    <span className="text-stone-500">Giá mua ngay</span>
                    <span className="font-semibold text-emerald-800 tabular-nums">
                      {auctionMoney(Number(buyNowPrice))}
                    </span>
                  </div>
                )}
              </div>

              <dl className="space-y-1.5 text-xs text-stone-600 tabular-nums">
                <div className="flex justify-between gap-2">
                  <dt className="text-stone-500">Mở phiên:</dt>
                  <dd className="font-medium text-stone-900">
                    {Number.isFinite(parsedStart) ? auctionDateWithTz(parsedStart) : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-stone-500">Đóng phiên:</dt>
                  <dd className="font-medium text-stone-900">
                    {Number.isFinite(parsedEnd) ? auctionDateWithTz(parsedEnd) : '—'}
                  </dd>
                </div>
              </dl>

              <p className="rounded-xl bg-stone-50 p-3 text-xs leading-5 text-stone-600">
                Gợi ý hiển thị cho Buyer ở lượt đầu: “Bạn có thể đặt từ{' '}
                <strong className="tabular-nums">{auctionMoney(Number(price) || 0)}</strong> cho
                lượt đầu”. Thiết lập chỉ sửa được trước giờ mở phiên.
              </p>
            </div>
          </aside>
        </form>
      )}

      {/* Unsaved changes dialog */}
      <Dialog
        open={!!leaveTo}
        onOpenChange={(open) => {
          if (!open) setLeaveTo(null);
        }}
      >
        <DialogContent className="admin-dialog p-6 sm:p-7">
          <DialogTitle>Bạn chưa lưu thay đổi</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-stone-600">
            Nếu rời trang ngay lúc này, các thông tin vừa nhập sẽ không được lưu.
          </DialogDescription>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-11 rounded-xl border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => {
                if (leaveTo) {
                  committed.current = true;
                  router.push(leaveTo);
                  setLeaveTo(null);
                }
              }}
            >
              Rời trang
            </Button>
            <Button
              type="button"
              onClick={() => setLeaveTo(null)}
              className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              Tiếp tục chỉnh sửa
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Final confirmation dialog */}
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      >
        <DialogContent className="admin-dialog p-6 sm:p-7">
          <DialogTitle>{id ? 'Xác nhận lưu thay đổi phiên?' : 'Xác nhận lịch đấu giá'}</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-stone-600">
            Kiểm tra sản phẩm, mức giá, phạm vi truy cập và mốc giờ trước khi lưu.
          </DialogDescription>
          {pending && (
            <div className="my-5 space-y-2 rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm">
              <p className="font-semibold text-stone-950">{product?.name}</p>
              <p className="text-xs text-stone-600">
                Seller: {product?.seller} ·{' '}
                {pending.visibility === 'RESTRICTED' ? 'Hạn chế' : 'Công khai'}
              </p>
              <p className="tabular-nums">
                Khởi điểm: <strong>{auctionMoney(pending.startingPrice)}</strong> · Bước giá:{' '}
                <strong>+{auctionMoney(pending.increment)}</strong>
              </p>
              {pending.buyNowPrice ? (
                <p className="tabular-nums">
                  Giá mua ngay: <strong>{auctionMoney(pending.buyNowPrice)}</strong>
                </p>
              ) : null}
              <p className="text-xs text-stone-700 tabular-nums">
                Mở: {auctionDateWithTz(pending.startAt)}
              </p>
              <p className="text-xs text-stone-700 tabular-nums">
                Đóng: {auctionDateWithTz(pending.endAt)}
              </p>
            </div>
          )}
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => setPending(null)}
              className="min-h-11 rounded-xl"
            >
              Xem lại
            </Button>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void save()}
              className="min-h-11 rounded-xl bg-emerald-700 text-white hover:bg-emerald-800"
            >
              {busy ? 'Đang lưu…' : 'Xác nhận lưu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
