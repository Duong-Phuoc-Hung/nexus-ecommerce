'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { sellerProductsApi, type BackendProduct } from '../api/seller-products.api';
import { PageHeading, DemoNote, optimizeImageFile } from '../components/seller-shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function SellerAuctionForm() {
  const router = useRouter();
  const [products, setProducts] = useState<BackendProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingProducts(true);

    sellerProductsApi
      .getMine('ACTIVE', controller.signal)
      .catch(() => sellerProductsApi.list(controller.signal))
      .then((items) => {
        if (!controller.signal.aborted) {
          setProducts(Array.isArray(items) ? items : []);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoadingProducts(false);
        }
      });

    return () => controller.abort();
  }, []);

  function handleProductChange(productId: string) {
    setSelectedProduct(productId);
    const prod = products.find((p) => String(p.id) === String(productId));
    if (prod) {
      const cachedProdImg =
        typeof window !== 'undefined'
          ? localStorage.getItem(`nexus_prod_img_${prod.id}`) ||
            localStorage.getItem(`nexus_prod_img_${prod.slug}`) ||
            localStorage.getItem(`nexus_prod_img_${prod.title}`)
          : null;
      const foundImg = prod.primaryImage || prod.images?.[0] || cachedProdImg || '';
      if (foundImg) {
        setImageUrl(foundImg);
      }
    }
  }

  async function handleImageFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Vui lòng chọn tệp định dạng hình ảnh (JPG, PNG, WebP,...).');
      return;
    }
    try {
      const optimized = await optimizeImageFile(file);
      setImageUrl(optimized);
      setError('');
    } catch {
      setError('Không thể xử lý tệp ảnh. Vui lòng thử lại với tệp ảnh khác.');
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const duration = Number(data.get('duration'));
    const price = Number(data.get('price'));

    if (!selectedProduct.trim()) {
      return setError('Vui lòng chọn sản phẩm trong kho của bạn để đưa vào phiên đấu giá.');
    }
    if (price <= 0) {
      return setError('Giá khởi điểm phải lớn hơn 0.');
    }
    if (duration < 1 || duration > 168) {
      return setError(
        'Thời lượng phiên phải từ 1 đến 168 giờ (tối thiểu 60 phút) theo đúng SRS 2.6.',
      );
    }

    setError('');

    const chosenProd = products.find((p) => String(p.id) === String(selectedProduct));
    const auctionId = `AUC-${Date.now().toString().slice(-6)}`;
    const startTime = data.get('start')
      ? new Date(String(data.get('start'))).toISOString()
      : new Date().toISOString();
    const endTime = new Date(Date.now() + duration * 3600 * 1000).toISOString();

    const newAuction = {
      id: auctionId,
      productId: selectedProduct,
      title: chosenProd?.title || `Sản phẩm #${selectedProduct}`,
      imageUrl: imageUrl || undefined,
      startingPrice: price,
      currentHighestBid: price,
      increment: Number(data.get('increment')) || 10,
      startAt: startTime,
      endAt: endTime,
      status: 'ACTIVE',
      bids: [],
    };

    if (typeof window !== 'undefined') {
      try {
        const currentAuctions = JSON.parse(localStorage.getItem('nexus_seller_auctions') || '[]');
        currentAuctions.unshift(newAuction);
        localStorage.setItem('nexus_seller_auctions', JSON.stringify(currentAuctions));
        if (imageUrl) {
          localStorage.setItem(`nexus_auction_img_${auctionId}`, imageUrl);
        }
      } catch (e) {
        console.error(e);
      }
    }

    setSubmitting(true);
    setMessage(
      `Đã khởi tạo thành công phiên đấu giá "${newAuction.title}" với mã ${auctionId}! Đang chuyển hướng về danh sách phiên...`,
    );

    setTimeout(() => {
      router.push('/seller/auctions');
    }, 1000);
  }

  return (
    <>
      <PageHeading
        eyebrow="KHÔNG GIAN NGƯỜI BÁN / ĐẤU GIÁ"
        title="Tạo phiên đấu giá"
        description="Thiết lập sản phẩm, giá khởi điểm và thời lượng phiên theo tiêu chuẩn hệ thống."
        action={
          <Link className="seller-button seller-button-quiet" href="/seller/auctions">
            ← Danh sách phiên
          </Link>
        }
      />
      <DemoNote message="Danh sách sản phẩm được tải trực tiếp từ Catalog API của Seller. Backend Auction Service đang chờ bổ sung endpoint tạo phiên (POST /auctions) theo SRS 3.5.1." />

      <div className="seller-policy-strip">
        <span>◎</span>
        <div>
          <strong>Quy chuẩn hệ thống đấu giá (SRS 2.6 & 3.5.1)</strong>
          <p>
            Thời lượng 1–168 giờ; tối đa 5 phiên hoạt động; bước giá mặc định 10 ₫; anti-sniping gia
            hạn 5 phút. Điểm uy tín tối thiểu 50 để tạo phiên.
          </p>
        </div>
      </div>

      <form className="seller-panel seller-form" onSubmit={submit} noValidate>
        <div className="seller-panel-heading">
          <div>
            <p className="seller-eyebrow">THIẾT LẬP PHIÊN</p>
            <h2>Thông tin đấu giá</h2>
          </div>
          <span className="seller-muted">Tối đa 5 phiên hoạt động</span>
        </div>

        <div className="seller-form-grid">
          <label>
            Sản phẩm đấu giá *
            <div style={{ marginTop: '6px' }}>
              <Select value={selectedProduct} onValueChange={handleProductChange}>
                <SelectTrigger aria-label="Chọn sản phẩm đấu giá">
                  <SelectValue
                    placeholder={
                      loadingProducts
                        ? 'Đang tải sản phẩm từ Catalog...'
                        : products.length === 0
                          ? 'Chưa có sản phẩm khả dụng trong kho'
                          : 'Chọn sản phẩm trong kho của bạn'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.title} (SKU: {p.slug ? p.slug.slice(0, 12).toUpperCase() : p.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </label>

          <div className="seller-form-full">
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Hình ảnh phiên đấu giá
            </label>
            <div className="seller-image-upload-zone">
              {imageUrl ? (
                <img src={imageUrl} alt="Preview" className="seller-image-preview-lg" />
              ) : (
                <div
                  className="seller-thumb-placeholder"
                  style={{ width: 72, height: 72, fontSize: '1.75rem' }}
                >
                  🏷️
                </div>
              )}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: '10px',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                  }}
                >
                  <label
                    className="seller-button seller-button-quiet"
                    style={{
                      cursor: 'pointer',
                      margin: 0,
                      padding: '7px 14px',
                      fontSize: '0.75rem',
                    }}
                  >
                    📁 Chọn ảnh từ máy tính
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handleImageFileChange}
                    />
                  </label>
                  {imageUrl && (
                    <button
                      type="button"
                      className="seller-button seller-button-quiet"
                      style={{
                        color: '#d9383a',
                        borderColor: '#fca5a5',
                        padding: '7px 12px',
                        fontSize: '0.75rem',
                      }}
                      onClick={() => setImageUrl('')}
                    >
                      ✕ Xóa ảnh
                    </button>
                  )}
                </div>
                <div style={{ marginTop: '8px' }}>
                  <input
                    type="url"
                    value={imageUrl.startsWith('data:') ? '' : imageUrl}
                    onChange={(e) => setImageUrl(e.target.value.trim())}
                    placeholder="Hoặc dán URL ảnh trực tiếp (https://...)"
                    style={{
                      width: '100%',
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                    }}
                  />
                </div>
                <small
                  style={{
                    display: 'block',
                    marginTop: '6px',
                    color: '#8892a0',
                    fontSize: '0.67rem',
                  }}
                >
                  {imageUrl
                    ? 'Ảnh phiên đấu giá sẽ hiển thị ngay tại cột Hình ảnh trên danh sách phiên.'
                    : 'Tự động lấy ảnh từ sản phẩm đã chọn hoặc bạn có thể tải lên ảnh riêng cho phiên đấu giá.'}
                </small>
              </div>
            </div>
          </div>

          <label>
            Giá khởi điểm (₫) *
            <input name="price" type="number" min="1" placeholder="Ví dụ: 500000" required />
          </label>

          <label>
            Bước giá (₫)
            <input name="increment" type="number" min="10" defaultValue="10" />
            <small>Bước giá mặc định tối thiểu 10 ₫ (SRS 2.6)</small>
          </label>

          <label>
            Thời lượng (giờ) *
            <input name="duration" type="number" min="1" max="168" defaultValue="24" required />
            <small>Từ 1 đến 168 giờ (tối thiểu 60 phút)</small>
          </label>

          <label className="seller-form-full">
            Thời gian bắt đầu *
            <input name="start" type="datetime-local" required />
          </label>
        </div>

        <div className="seller-check-row">
          <span>✓</span>
          <p>
            Phiên đấu giá tự động bật tính năng chống đấu giá phút cuối (Anti-sniping 5 phút theo
            SRS 2.6).
          </p>
        </div>

        {error && (
          <div className="seller-form-alert error" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div
            className="seller-form-alert success"
            role="status"
            style={{
              background: '#f0fdf4',
              color: '#166534',
              borderColor: '#bbf7d0',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '0.78rem',
              lineHeight: 1.5,
            }}
          >
            {message}
          </div>
        )}

        <div className="seller-form-actions">
          <button
            type="submit"
            className="seller-button seller-button-primary"
            disabled={submitting}
          >
            {submitting ? 'Đang tạo phiên...' : 'Xác nhận tạo phiên đấu giá'}
          </button>
        </div>
      </form>
    </>
  );
}
