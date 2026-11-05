'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { requestApi } from '@/lib/axios/api-client';
import { userMessage } from '@/lib/axios/http';
import { createShipmentsApi } from '@/modules/fulfillment/api/shipments.api';
const api = createShipmentsApi(requestApi, '/fulfillments');
const labels: Record<string, string> = {
  READY_TO_PICK: 'Chờ lấy hàng',
  PICKED: 'Đã lấy hàng',
  IN_TRANSIT: 'Đang vận chuyển',
  OUT_FOR_DELIVERY: 'Đang giao đến người nhận',
  DELIVERED: 'Đã giao',
  FAILED: 'Giao thất bại',
  RETURNED: 'Đã trả hàng',
};
// Conservative UI policy; the server must enforce transitions and concurrency too.
const next: Record<string, string[]> = {
  READY_TO_PICK: ['PICKED'],
  PICKED: ['IN_TRANSIT'],
  IN_TRANSIT: ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
  FAILED: ['OUT_FOR_DELIVERY', 'RETURNED'],
  DELIVERED: [],
  RETURNED: [],
};
export function AdminShipmentActions({
  data,
  onSaved,
}: {
  data: Record<string, unknown>;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState(''),
    [status, setStatus] = useState(''),
    [location, setLocation] = useState(''),
    [address, setAddress] = useState(''),
    [tracking, setTracking] = useState(''),
    [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const allowed = next[String(data.statusCode ?? data.status)] ?? [];
  function open(value: string) {
    setMode(value);
    setStatus('');
    setLocation('');
    setAddress(String(data.shippingAddress ?? ''));
    setTracking(String(data.trackingCode ?? ''));
    setReason('');
    setError('');
    setNotice('');
  }
  async function save() {
    if (busy || reason.trim().length < 10) return;
    setBusy(true);
    setError('');
    try {
      if (mode === 'status') {
        if (!allowed.includes(status)) throw new Error('Chọn trạng thái tiếp theo hợp lệ.');
        await api.updateStatus(String(data.id), {
          status,
          location: location.trim() || undefined,
          note: reason.trim(),
        });
      } else {
        if (!address.trim() || !tracking.trim()) throw new Error('Nhập địa chỉ và mã vận đơn.');
        await api.override(String(data.id), {
          trackingCode: tracking.trim(),
          shippingAddress: address.trim(),
          reason: reason.trim(),
        });
      }
      setMode('');
      setNotice('Đã cập nhật vận đơn.');
      onSaved();
    } catch (e) {
      setError(userMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="rounded-2xl border border-line bg-white p-6">
      <h2 className="font-semibold">Xử lý vận đơn</h2>
      <p className="my-3 text-sm text-slate-600">
        Kiểm tra đối tượng và thông tin mới trước khi xác nhận. Không đổi trạng thái đơn thanh toán
        tại đây.
      </p>
      {notice && (
        <p role="status" className="my-3 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button disabled={!allowed.length} onClick={() => open('status')}>
          Cập nhật hành trình
        </Button>
        <Button variant="outline" onClick={() => open('override')}>
          Điều chỉnh thông tin
        </Button>
      </div>
      {!allowed.length && (
        <p className="mt-3 text-sm text-slate-500">
          Trạng thái hiện tại không cho phép chuyển tiếp tại màn hình này.
        </p>
      )}
      <Dialog
        open={!!mode}
        onOpenChange={(v) => {
          if (!v && !busy) setMode('');
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogTitle>
            {mode === 'status' ? 'Cập nhật hành trình' : 'Điều chỉnh vận đơn'}
          </DialogTitle>
          <DialogDescription>
            Vận đơn {String(data.trackingCode ?? data.id)}. Thao tác sẽ được gửi khi bạn xác nhận.
          </DialogDescription>
          {mode === 'status' ? (
            <>
              <label className="space-y-2 text-sm">
                Trạng thái mới
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn trạng thái tiếp theo" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowed.map((v) => (
                      <SelectItem key={v} value={v}>
                        {labels[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2 text-sm">
                Vị trí hiện tại
                <Input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  maxLength={200}
                />
              </label>
            </>
          ) : (
            <>
              <label className="space-y-2 text-sm">
                Mã vận đơn
                <Input
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                  maxLength={100}
                />
              </label>
              <label className="space-y-2 text-sm">
                Địa chỉ giao hàng
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  maxLength={500}
                />
              </label>
            </>
          )}
          <label className="space-y-2 text-sm">
            Lý do (ít nhất 10 ký tự)
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" disabled={busy} onClick={() => setMode('')}>
              Đóng
            </Button>
            <Button
              disabled={busy || reason.trim().length < 10 || (mode === 'status' && !status)}
              onClick={() => void save()}
            >
              {busy ? 'Đang lưu…' : 'Xác nhận cập nhật'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
