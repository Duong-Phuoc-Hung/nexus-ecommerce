'use client';

import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AuctionModel3D } from '../api/auction.api';

interface Auction3DViewerProps {
  model: AuctionModel3D;
  title: string;
  fallbackImage: string;
  onClose: () => void;
}

function detectWebGlSupport(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
  } catch {
    return false;
  }
}

export function Auction3DViewer({ model, title, fallbackImage, onClose }: Auction3DViewerProps) {
  const [webglReady, setWebglReady] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [yaw, setYaw] = useState(0);
  const [zoom, setZoom] = useState(1);
  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setWebglReady(detectWebGlSupport());
    closeBtnRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setYaw((v) => v - 15);
      } else if (e.key === 'ArrowRight') {
        setYaw((v) => v + 15);
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))));
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const unavailable = webglReady === false || loadError;

  return (
    <div
      role="region"
      aria-label={`Trình xem 3D của ${title}`}
      className="relative overflow-hidden rounded-3xl border border-line bg-stone-100"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-white px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-stone-900">{model.label || 'Chế độ xem 3D'}</span>
          {model.isIllustrative && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900">
              Mô hình minh họa
            </span>
          )}
        </div>
        <Button
          ref={closeBtnRef}
          type="button"
          variant="outline"
          size="sm"
          onClick={onClose}
          className="min-h-11 gap-1.5 rounded-xl px-3 text-xs font-semibold"
        >
          <ImageIcon className="size-4" aria-hidden="true" />
          Trở về ảnh
        </Button>
      </div>

      {unavailable ? (
        <div className="relative aspect-[5/4] max-h-[420px] w-full">
          <img
            src={model.poster || fallbackImage}
            alt={title}
            className="size-full object-cover"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = '/images/nexus-product-placeholder.svg';
            }}
          />
          <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-amber-200 bg-white/95 p-3.5 text-xs text-stone-800 shadow-sm">
            <p className="flex items-center gap-2 font-semibold text-amber-900">
              <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
              Thiết bị hoặc kết nối chưa hỗ trợ hiển thị mô hình 3D.
            </p>
            <p className="mt-1 text-muted">
              Bạn vẫn có thể xem ảnh thật và hoàn tất đặt giá bình thường.
            </p>
          </div>
        </div>
      ) : (
        <div
          className="relative flex aspect-[5/4] max-h-[420px] w-full cursor-grab items-center justify-center overflow-hidden bg-gradient-to-b from-stone-100 to-stone-200/70 select-none active:cursor-grabbing"
          onPointerDown={(e) => {
            draggingRef.current = true;
            lastXRef.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            const dx = e.clientX - lastXRef.current;
            lastXRef.current = e.clientX;
            setYaw((v) => v + dx * 0.5);
          }}
          onPointerUp={() => {
            draggingRef.current = false;
          }}
          onPointerLeave={() => {
            draggingRef.current = false;
          }}
        >
          <img
            src={model.poster || fallbackImage}
            alt={`Góc nhìn 3D của ${title}`}
            draggable={false}
            onError={() => setLoadError(true)}
            style={{
              transform: `perspective(900px) rotateY(${yaw}deg) scale(${zoom})`,
            }}
            className="max-h-[78%] max-w-[78%] rounded-2xl object-contain shadow-md motion-safe:transition-transform motion-safe:duration-150"
          />
          <p className="pointer-events-none absolute top-3 left-4 rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-stone-700">
            Kéo ngang hoặc dùng nút bên dưới để xoay · Góc {Math.round(((yaw % 360) + 360) % 360)}°
          </p>
        </div>
      )}

      {!unavailable && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-white px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Xoay trái 15 độ"
              onClick={() => setYaw((v) => v - 15)}
              className="min-h-11 min-w-11 px-2.5"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Xoay phải 15 độ"
              onClick={() => setYaw((v) => v + 15)}
              className="min-h-11 min-w-11 px-2.5"
            >
              <RotateCw className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Thu nhỏ"
              onClick={() => setZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))))}
              className="min-h-11 min-w-11 px-2.5"
            >
              <ZoomOut className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Phóng to"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.15).toFixed(2))))}
              className="min-h-11 min-w-11 px-2.5"
            >
              <ZoomIn className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setYaw(0);
              setZoom(1);
            }}
            className="min-h-11 gap-1.5 text-xs font-semibold text-stone-700"
          >
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Đặt lại góc nhìn
          </Button>
        </div>
      )}
    </div>
  );
}
