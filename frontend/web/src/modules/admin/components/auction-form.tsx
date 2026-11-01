'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Gavel, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { appConfig } from '@/configs/app.config';
import {
  auctionApi,
  validateAuction,
  canManageAuction,
  type AuctionInput,
} from '@/modules/auction/api/auction.api';
import { auctionMoney, auctionDate } from '@/modules/auction/components/auction-ui';
import { useAuctions } from '@/modules/auction/hooks/use-auctions';
import type { MarketplaceProduct } from '@/modules/home/types/marketplace.types';
function localDate(time: number) {
  const d = new Date(time);
  return new Date(time - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function AuctionForm({ id }: { id?: string }) {
  const router = useRouter();
  const { rows: auctions } = useAuctions();
  const [baseline, setBaseline] = useState('');
  const [leaveTo, setLeaveTo] = useState<string | null>(null);
  const committed = useRef(false);
  const { user } = useSession();
  const [products, setProducts] = useState<MarketplaceProduct[]>([]);
  const [productId, setProductId] = useState('');
  const [price, setPrice] = useState('');
  const [increment, setIncrement] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [version, setVersion] = useState<number>();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<AuctionInput | null>(null);
  const canSave =
    appConfig.auctionSource === 'mock' &&
    canManageAuction(user, id ? 'AUCTION.UPDATE' : 'AUCTION.CREATE');
  const fingerprint = JSON.stringify([productId, price, increment, start, end]);
  const dirty = !loading && !!baseline && baseline !== fingerprint;
  const reserved = new Set(
    auctions
      .filter((a) => a.id !== id && ['SCHEDULED', 'ACTIVE'].includes(a.status))
      .map((a) => a.productId),
  );
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
            setError('Chỉ có thể sửa phiên chưa bắt đầu.');
            return;
          }
          setProductId(auction.productId);
          setPrice(String(auction.startingPrice));
          setIncrement(String(auction.increment));
          setStart(localDate(auction.startAt));
          setEnd(localDate(auction.endAt));
          setVersion(auction.version);
          setBaseline(
            JSON.stringify([
              auction.productId,
              String(auction.startingPrice),
              String(auction.increment),
              localDate(auction.startAt),
              localDate(auction.endAt),
            ]),
          );
        } else {
          const initialStart = localDate(Date.now() + 86400000),
            initialEnd = localDate(Date.now() + 172800000);
          setStart(initialStart);
          setEnd(initialEnd);
          setBaseline(JSON.stringify(['', '', '', initialStart, initialEnd]));
        }
      } catch (e) {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Không tải được dữ liệu.');
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
  function review(e: FormEvent) {
    e.preventDefault();
    if (!canSave || blocked || busy) return;
    const errors: Record<string, string> = {};
    const input = {
      productId,
      startingPrice: Number(price),
      increment: Number(increment),
      startAt: new Date(start).getTime(),
      endAt: new Date(end).getTime(),
    };
    if (!productId) errors.product = 'Chọn sản phẩm cho phiên đấu.';
    else if (reserved.has(productId))
      errors.product = 'Sản phẩm đang có phiên mở. Hãy chọn sản phẩm khác.';
    if (
      !Number.isSafeInteger(input.startingPrice) ||
      input.startingPrice <= 0 ||
      input.startingPrice > 1e12
    )
      errors.price = 'Nhập số nguyên VND dương, tối đa 1.000 tỷ.';
    if (!Number.isSafeInteger(input.increment) || input.increment <= 0 || input.increment > 1e12)
      errors.increment = 'Nhập bước giá nguyên dương, tối đa 1.000 tỷ.';
    if (!Number.isFinite(input.startAt) || input.startAt <= Date.now())
      errors.start = 'Thời gian bắt đầu phải ở tương lai.';
    const duration = input.endAt - input.startAt;
    if (!Number.isFinite(duration) || duration < 3600000 || duration > 168 * 3600000)
      errors.end = 'Thời lượng phải từ 1 giờ đến 7 ngày.';
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
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save() {
    if (!pending || !user || busy || !canSave) return;
    setBusy(true);
    try {
      const row = await auctionApi.save(pending, id, version, user);
      committed.current = true;
      router.push('/admin/auctions/' + row.id);
    } catch (e) {
      setPending(null);
      setError(
        e instanceof Error ? e.message : 'Không lưu được phiên. Dữ liệu nhập vẫn được giữ lại.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      {appConfig.auctionSource !== 'mock' && (
        <p
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Chức năng lưu cấu hình phiên chưa được mở. Chỉ phiên chưa bắt đầu mới được thay đổi giá và
          lịch.
        </p>
      )}
      <Button variant="ghost" asChild>
        <Link href={id ? '/admin/auctions/' + id : '/admin/auctions'}>
          <ArrowLeft size={16} />
          Quay lại phiên đấu
        </Link>
      </Button>
      <header>
        <p className="mb-2 text-xs font-bold tracking-[.18em] text-brand-dark">
          CHUẨN BỊ PHIÊN ĐẤU
        </p>
        <h1>{id ? 'Chỉnh sửa phiên đấu' : 'Tạo phiên đấu mới'}</h1>
        <p className="text-sm text-muted">
          Chọn món đồ, thiết lập mức giá và thời gian. Kiểm tra trước khi lưu.
        </p>
      </header>
      {!canSave && (
        <p
          role="status"
          className="rounded-xl border border-line bg-slate-50 p-4 text-sm text-muted"
        >
          Bạn có quyền xem nhưng chưa có quyền lưu thay đổi phiên đấu.
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Đang tải thông tin…</p>
      ) : (
        <form
          onSubmit={review}
          noValidate
          className="grid items-start gap-6 xl:grid-cols-[1.7fr_1fr]"
        >
          <div className="space-y-6">
            <fieldset disabled={busy || blocked || !canSave} className="space-y-6">
              <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <h2 className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-soft px-3 py-2 text-sm text-brand-dark">
                    01
                  </span>
                  Sản phẩm tham gia
                </h2>
                <label htmlFor="auction-product" className="mt-6 mb-2 block text-sm font-semibold">
                  Sản phẩm *
                </label>
                <Select
                  value={productId}
                  onValueChange={(value) => {
                    setProductId(value);
                  }}
                  disabled={!!id || busy || blocked || !canSave}
                >
                  <SelectTrigger
                    id="auction-product"
                    className="w-full"
                    aria-invalid={!!fields.product}
                    aria-describedby="product-error"
                  >
                    <SelectValue placeholder="Chọn sản phẩm…" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id} disabled={reserved.has(p.id)}>
                        {p.name}
                        {reserved.has(p.id) ? ' · Đang có phiên mở' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p id="product-error" className="mt-2 text-sm text-red-700">
                  {fields.product}
                </p>
                <p className="mt-2 text-xs text-muted">
                  Mỗi sản phẩm chỉ có một phiên sắp diễn ra hoặc đang diễn ra.
                </p>
              </section>
              <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <h2 className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-soft px-3 py-2 text-sm text-brand-dark">
                    02
                  </span>
                  Thiết lập mức giá
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    { key: 'price', label: 'Giá khởi điểm (VND)', value: price, set: setPrice },
                    {
                      key: 'increment',
                      label: 'Bước giá (VND)',
                      value: increment,
                      set: setIncrement,
                    },
                  ].map((f) => (
                    <div key={f.key}>
                      <label htmlFor={f.key} className="mb-2 block text-sm font-semibold">
                        {f.label} *
                      </label>
                      <Input
                        id={f.key}
                        type="number"
                        min={1}
                        max={1e12}
                        step={1}
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        aria-invalid={!!fields[f.key]}
                        aria-describedby={f.key + '-error'}
                      />
                      <p id={f.key + '-error'} className="mt-2 text-sm text-red-700">
                        {fields[f.key]}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-3xl border border-line bg-white p-6 sm:p-8">
                <h2 className="flex items-center gap-3">
                  <span className="rounded-full bg-brand-soft px-3 py-2 text-sm text-brand-dark">
                    03
                  </span>
                  Lịch diễn ra
                </h2>
                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    { key: 'start', label: 'Bắt đầu', value: start, set: setStart },
                    { key: 'end', label: 'Kết thúc', value: end, set: setEnd },
                  ].map((f) => (
                    <div key={f.key}>
                      <label htmlFor={f.key} className="mb-2 block text-sm font-semibold">
                        {f.label} *
                      </label>
                      <Input
                        id={f.key}
                        type="datetime-local"
                        value={f.value}
                        onChange={(e) => f.set(e.target.value)}
                        aria-invalid={!!fields[f.key]}
                        aria-describedby={f.key + '-error'}
                      />
                      <p id={f.key + '-error'} className="mt-2 text-sm text-red-700">
                        {fields[f.key]}
                      </p>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted">
                  Theo múi giờ thiết bị. Thời lượng phiên từ 1 giờ đến 7 ngày.
                </p>
              </section>
            </fieldset>
            <div className="flex flex-wrap justify-end gap-3">
              <Button asChild variant="outline">
                <Link href="/admin/auctions">Hủy thay đổi</Link>
              </Button>
              <Button type="submit" disabled={busy || blocked || !canSave}>
                <CheckCircle2 size={17} />
                Kiểm tra và lưu
              </Button>
            </div>
          </div>
          <aside className="overflow-hidden rounded-3xl border border-line bg-white xl:sticky xl:top-6">
            {product ? (
              <img
                src={product.image}
                alt={product.name}
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/3] items-center justify-center bg-slate-100">
                <Gavel size={48} className="text-slate-300" />
              </div>
            )}
            <div className="space-y-5 p-6">
              <p className="text-xs font-semibold tracking-widest text-muted">TÓM TẮT PHIÊN</p>
              <h2>{product?.name || 'Món đồ cho phiên đấu tiếp theo'}</h2>
              <div className="border-y border-line py-5">
                <p className="text-xs text-muted">Giá khởi điểm</p>
                <p className="mt-2 text-2xl font-bold text-brand-dark">
                  {auctionMoney(Number(price) || 0)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Bước giá: {auctionMoney(Number(increment) || 0)}
                </p>
              </div>
              <p className="flex items-start gap-2 text-sm text-muted">
                <CalendarClock size={18} className="shrink-0" />
                Thiết lập chỉ được chỉnh sửa trước khi phiên bắt đầu.
              </p>
            </div>
          </aside>
        </form>
      )}
      <Dialog
        open={!!leaveTo}
        onOpenChange={(open) => {
          if (!open) setLeaveTo(null);
        }}
      >
        <DialogContent className="admin-dialog p-7">
          <DialogTitle>Bạn chưa lưu thay đổi</DialogTitle>
          <DialogDescription className="mt-3">
            Nếu rời trang, nội dung vừa nhập sẽ không được lưu. Bạn muốn tiếp tục chỉnh sửa?
          </DialogDescription>
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              className="admin-danger"
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
            <Button onClick={() => setLeaveTo(null)}>Tiếp tục chỉnh sửa</Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
      >
        <DialogContent className="admin-dialog p-7">
          <DialogTitle>{id ? 'Lưu thay đổi phiên?' : 'Xác nhận lịch đấu giá'}</DialogTitle>
          <DialogDescription className="mt-3">
            Kiểm tra sản phẩm, mức giá và thời gian trước khi lưu phiên.
          </DialogDescription>
          <div className="my-6 space-y-3 rounded-2xl bg-slate-50 p-5 text-sm">
            <strong>{product?.name}</strong>
            <p>Khởi điểm: {auctionMoney(pending?.startingPrice || 0)}</p>
            <p>Bước giá: {auctionMoney(pending?.increment || 0)}</p>
            {pending && (
              <>
                <p>Bắt đầu: {auctionDate(pending.startAt)}</p>
                <p>Kết thúc: {auctionDate(pending.endAt)}</p>
              </>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setPending(null)}>
              Xem lại
            </Button>
            <Button disabled={busy} onClick={() => void save()}>
              {busy ? 'Đang lưu…' : 'Xác nhận lưu'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
