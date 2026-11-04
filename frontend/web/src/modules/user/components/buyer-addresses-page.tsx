'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { MapPin, Plus, Pencil, Trash2 } from 'lucide-react';
import { StoreHeader } from '@/components/layout/store-header';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useSession } from '@/modules/auth/hooks/use-session';
import { safeNextPath } from '@/lib/utils/navigation';
import { AddressForm } from './address-form';
import {
  ADDRESS_CHANGE_EVENT,
  deleteAddress,
  formatAddress,
  readAddresses,
  readContactPhone,
  saveAddress,
  setDefaultAddress,
  type AddressInput,
  type ShippingAddress,
} from '../utils/address-book';

export function BuyerAddressesPage() {
  const { user, phase } = useSession();
  const params = useSearchParams();
  const setup = params?.get('setup') === '1';
  const next = safeNextPath(params?.get('next'));
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [editing, setEditing] = useState<ShippingAddress | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ShippingAddress | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    const sync = () => setAddresses(readAddresses(user.id));
    sync();
    window.addEventListener(ADDRESS_CHANGE_EVENT, sync);
    return () => window.removeEventListener(ADDRESS_CHANGE_EVENT, sync);
  }, [user?.id]);

  function save(input: AddressInput, makeDefault: boolean) {
    if (!user) return;
    try {
      saveAddress(user.id, input, {
        id: editing && editing !== 'new' ? editing.id : undefined,
        makeDefault,
      });
      setEditing(null);
      setError('');
      if (setup) window.location.assign(next);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Chưa lưu được địa chỉ.');
    }
  }

  return (
    <>
      <StoreHeader />
      <main className="nexus-container min-h-[70vh] py-8">
        <Link href="/account" className="text-sm text-muted hover:text-brand-dark">
          ← Tài khoản
        </Link>
        <div className="mt-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-brand-dark">
              TÀI KHOẢN BUYER
            </p>
            <h1 className="mt-2 text-3xl font-bold">Địa chỉ nhận hàng</h1>
            <p className="mt-2 text-sm text-muted">
              Chọn nơi giao quen thuộc, thay đổi khi đặt hàng.
            </p>
          </div>
          {user?.role === 'BUYER' && (
            <Button onClick={() => setEditing('new')} disabled={addresses.length >= 5}>
              <Plus aria-hidden="true" className="size-4" /> Thêm địa chỉ
            </Button>
          )}
        </div>
        {setup && user?.role === 'BUYER' && (
          <section className="mt-6 rounded-2xl border border-brand/20 bg-brand-soft p-5">
            <h2 className="font-semibold text-brand-dark">Tài khoản của bạn đã sẵn sàng</h2>
            <p className="mt-1 text-sm text-muted">
              Thêm địa chỉ đầu tiên để lần đặt hàng sau được điền nhanh. Bạn cũng có thể bổ sung
              trước khi thanh toán.
            </p>
            <Button
              variant="ghost"
              className="mt-3 px-0 text-brand-dark underline"
              onClick={() => window.location.assign(next)}
            >
              Để sau, tiếp tục khám phá
            </Button>
          </section>
        )}
        {phase === 'loading' ? (
          <p className="mt-8" role="status">
            Đang xác minh tài khoản…
          </p>
        ) : user?.role !== 'BUYER' ? (
          <div className="mt-8 rounded-2xl border border-line bg-white p-8 text-sm">
            Vui lòng đăng nhập tài khoản Buyer để quản lý địa chỉ.{' '}
            <Link
              href="/login?next=%2Faccount%2Faddresses"
              className="font-semibold text-brand-dark underline"
            >
              Đăng nhập
            </Link>
          </div>
        ) : addresses.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-line bg-white p-10 text-center">
            <MapPin aria-hidden="true" className="mx-auto size-9 text-brand" />
            <h2 className="mt-4 text-lg font-semibold">Chưa có địa chỉ nhận hàng</h2>
            <p className="mt-2 text-sm text-muted">Thêm một địa chỉ để tự điền khi thanh toán.</p>
            <Button className="mt-5" onClick={() => setEditing('new')}>
              Thêm địa chỉ đầu tiên
            </Button>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {addresses.map((address) => (
              <article
                key={address.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold">
                      {address.label}
                    </span>
                    {address.isDefault && (
                      <span className="rounded-lg bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-dark">
                        Mặc định
                      </span>
                    )}
                  </div>
                  <MapPin aria-hidden="true" className="size-5 text-brand" />
                </div>
                <h2 className="mt-4 font-semibold">
                  {address.recipientName}{' '}
                  <span className="ml-2 font-normal text-muted">{address.phone}</span>
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted">{formatAddress(address)}</p>
                {address.note && <p className="mt-1 text-xs text-muted">Ghi chú: {address.note}</p>}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                  {!address.isDefault && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDefaultAddress(user.id, address.id)}
                    >
                      Đặt mặc định
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => setEditing(address)}>
                    <Pencil aria-hidden="true" className="size-4" /> Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleting(address)}
                    className="text-brand-dark"
                  >
                    <Trash2 aria-hidden="true" className="size-4" /> Xóa
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
        {user?.role === 'BUYER' && (
          <p className="mt-6 text-xs text-muted">
            Địa chỉ hiện được lưu riêng cho tài khoản này trên trình duyệt; chưa đồng bộ với máy
            khác.
          </p>
        )}
        {error && (
          <p className="mt-4 text-sm text-brand-dark" role="alert">
            {error}
          </p>
        )}
      </main>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="max-w-xl p-6 sm:p-8">
          <DialogTitle>{editing === 'new' ? 'Thêm địa chỉ' : 'Sửa địa chỉ'}</DialogTitle>
          <DialogDescription className="mt-1 mb-5">
            Thông tin này sẽ được điền vào bước giao hàng khi bạn chọn địa chỉ.
          </DialogDescription>
          {editing && user && (
            <AddressForm
              key={editing === 'new' ? 'new' : editing.id}
              initial={editing === 'new' ? null : editing}
              fullName={user.fullName}
              phone={readContactPhone(user.id)}
              onSave={save}
              onCancel={() => setEditing(null)}
            />
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-brand-dark">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null);
        }}
      >
        <DialogContent className="p-6">
          <DialogTitle>Xóa địa chỉ này?</DialogTitle>
          <DialogDescription className="mt-2">
            Địa chỉ đã ghi trên đơn cũ không bị thay đổi. Nếu đây là địa chỉ mặc định, địa chỉ tiếp
            theo sẽ được chọn thay thế.
          </DialogDescription>
          <div className="mt-6 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Giữ lại
            </Button>
            <Button
              onClick={() => {
                if (user && deleting) deleteAddress(user.id, deleting.id);
                setDeleting(null);
              }}
            >
              Xóa địa chỉ
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
