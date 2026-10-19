'use client';
import { Button } from '@/components/ui/button';

import { useEffect, useRef, useState } from 'react';
import type { MarketplaceProduct } from '../types/marketplace.types';
import { MarketplaceIcon } from './marketplace-icon';
import { money, ProductPhoto } from './marketplace-card';
import { appConfig } from '@/configs/app.config';

const slides = [
  {
    productId: 'NX-215',
    media: 'video',
    poster: '/images/nexus-vinyl-poster.jpg',
    tag: 'ÂM THANH & NHỮNG ĐAM MÊ',
    title: ['Đam mê có gu.', 'Giá trị có chiều sâu.'],
    subtitle:
      'Một bản nhạc hay. Một món đồ đúng gu. Khám phá những lựa chọn cho không gian sống và bộ sưu tập của riêng bạn.',
    href: '#discover',
    action: 'Khám phá sản phẩm',
    label: 'Cho góc nghe nhạc của bạn',
  },
  {
    productId: 'NX-101',
    media: 'image',
    poster: '/images/nexus-camera-hero.jpg',
    tag: 'NEXUS LIVE · ĐẤU GIÁ TRỰC TIẾP',
    title: ['Món đồ đáng giá.', 'Cuộc đấu dành cho bạn.'],
    subtitle:
      'Theo dõi những phiên đấu được lựa chọn cho người yêu công nghệ và sưu tầm. Mỗi món đồ, một cơ hội sở hữu theo cách riêng.',
    href: '#live-auctions',
    action: 'Khám phá phiên đấu',
    label: 'Phiên đấu nổi bật',
  },
  {
    productId: 'NX-108',
    media: 'image',
    poster: '/images/nexus-watch-hero.jpg',
    tag: 'KHÁM PHÁ PHONG CÁCH RIÊNG',
    title: ['Chọn điều bạn thích.', 'Giữ điều bạn yêu.'],
    subtitle:
      'Từ chiếc đồng hồ đồng hành mỗi ngày đến món đồ cho bộ sưu tập. Kết nối với những giá trị phù hợp với bạn.',
    href: '#discover',
    action: 'Tìm phong cách của bạn',
    label: 'Lựa chọn cho mỗi ngày',
  },
];

export function MarketplaceHero({
  products,
  onOpen,
  suspended = false,
}: {
  products: MarketplaceProduct[];
  suspended?: boolean;
  onOpen: (product: MarketplaceProduct) => void;
}) {
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReduced(preference.matches);
    const updateVisibility = () => setHidden(document.hidden);
    updateMotion();
    updateVisibility();
    preference.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      preference.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  const slide = slides[index];
  const motionAllowed = !reduced && !hidden && !suspended;
  const videoPlaying = motionAllowed && slide.media === 'video';
  const rotating = motionAllowed && !hovered && !focused;
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (videoPlaying) {
      element.muted = true;
      void element.play().catch(() => setVideoReady(false));
    } else element.pause();
  }, [videoPlaying]);
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slides.length), 8000);
    return () => window.clearInterval(timer);
  }, [rotating, index]);

  const product = products.find((item) => item.id === slide.productId)!;
  function go(direction: number) {
    setIndex((value) => (value + direction + slides.length) % slides.length);
  }

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Bộ sưu tập nổi bật"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      }}
      className="nexus-hero nexus-video-hero relative isolate overflow-hidden rounded-3xl text-white"
      data-motion={videoPlaying ? 'playing' : 'paused'}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <img
          key={slide.productId}
          src={slide.poster}
          alt=""
          width={1280}
          height={720}
          className="size-full object-cover object-[65%_center]"
        />
        <video
          ref={video}
          autoPlay={!reduced && slide.media === 'video'}
          loop
          muted
          playsInline
          preload={reduced ? 'none' : 'metadata'}
          poster="/images/nexus-vinyl-poster.jpg"
          onPlaying={() => setVideoReady(true)}
          onError={() => setVideoReady(false)}
          className={`absolute inset-0 size-full object-cover object-[65%_center] transition-opacity duration-700 ${videoReady && !reduced && slide.media === 'video' ? 'opacity-100' : 'opacity-0'}`}
        >
          <source src="/videos/nexus-vinyl-hero.mp4" type="video/mp4" />
        </video>
        <div className="nexus-video-overlay absolute inset-0" />
        <div className="nexus-video-grid absolute inset-0 opacity-30" />
      </div>
      <div className="relative grid gap-8 px-6 pb-4 pt-10 sm:px-10 lg:min-h-[410px] lg:grid-cols-[1.3fr_.7fr] lg:px-14 lg:pt-12">
        <div
          key={index}
          id="hero-slide"
          role="group"
          aria-roledescription="slide"
          aria-label={`${index + 1} trên ${slides.length}: ${slide.tag}`}
          className="hero-slide min-h-[300px] sm:min-h-[315px]"
        >
          <p className="mb-6 flex items-center gap-3 text-[10px] font-semibold tracking-[.2em] text-white/85">
            <span className="h-px w-8 bg-white/60" />
            {slide.tag}
          </p>
          <h1 className="hero-cinematic-title font-bold leading-[1.1] tracking-[-.045em]">
            {slide.title[0]}
            <br />
            <span className="text-red-200">{slide.title[1]}</span>
          </h1>
          <p className="mt-5 max-w-[430px] text-sm leading-6 text-white/85">{slide.subtitle}</p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <a
              href={slide.href}
              className="inline-flex min-h-12 items-center gap-5 rounded-xl bg-white px-5 text-xs font-bold text-brand-dark transition hover:-translate-y-0.5 hover:bg-brand-soft motion-reduce:transform-none"
            >
              {slide.action}
              <MarketplaceIcon name="arrow" className="size-4" />
            </a>
            <a
              href={slide.href === '#discover' ? '#live-auctions' : '#discover'}
              className="inline-flex min-h-11 items-center gap-2 border-b border-white/35 text-xs font-medium text-white/90 transition hover:border-white hover:text-white"
            >
              {slide.href === '#discover' ? 'Đến khu đấu giá' : 'Đến khu mua sắm'}
              <MarketplaceIcon name="chevron" className="size-3.5" />
            </a>
          </div>
        </div>
        <div className="hidden flex-col justify-between gap-6 pb-1 lg:flex">
          <p className="ml-auto text-right text-[10px] font-medium tracking-[.22em] text-white/70">
            NEXUS COLLECTION
            <br />
            <span className="mt-2 block tracking-[.12em] text-white/45">
              KHÁM PHÁ THEO CÁCH CỦA BẠN
            </span>
          </p>
          {appConfig.catalogSource === 'mock' && product && (
            <Button
              variant="ghost"
              size="plain"
              onClick={() => onOpen(product)}
              aria-label={`Xem sản phẩm nổi bật ${product.name}`}
              className="group mt-auto w-full max-w-[350px] self-end rounded-2xl border border-white/25 bg-white/10 p-4 text-left shadow-[0_12px_40px_#00000020] backdrop-blur-xl transition duration-300 hover:border-white/50 hover:bg-white/15"
            >
              <p className="mb-3 flex items-center gap-2 text-[10px] font-medium tracking-wide text-white/75">
                <MarketplaceIcon
                  name={product.mode === 'auction' ? 'gavel' : 'headphones'}
                  className="size-3.5"
                />
                {slide.label}
              </p>
              <div className="flex items-center gap-3">
                <ProductPhoto
                  product={product}
                  priority
                  className="size-[72px] shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-5">{product.name}</p>
                  <p className="mt-1.5 text-[10px] text-white/65">
                    {product.mode === 'auction'
                      ? `${product.bids} lượt trả · Giá hiện tại`
                      : 'Giá bán'}
                  </p>
                  <strong className="mt-1 block text-lg tracking-tight">
                    {money(product.price)}
                  </strong>
                </div>
                <MarketplaceIcon
                  name="arrow"
                  className="ml-auto size-4 shrink-0 transition group-hover:translate-x-1"
                />
              </div>
            </Button>
          )}
        </div>
      </div>
      <div className="relative flex items-center justify-between gap-3 px-6 pb-6 sm:px-10 lg:px-14">
        <div className="flex items-center gap-1">
          {slides.map((item, slideIndex) => (
            <Button
              variant="ghost"
              size="plain"
              key={item.productId}
              aria-label={`Xem banner ${slideIndex + 1}`}
              aria-pressed={index === slideIndex}
              onClick={() => setIndex(slideIndex)}
              className="grid h-11 w-8 place-items-center sm:w-11"
            >
              <span
                className={`h-1 rounded-full transition-all ${index === slideIndex ? 'w-6 bg-white' : 'w-2 bg-white/45'}`}
              />
            </Button>
          ))}
          <span className="ml-2 whitespace-nowrap text-[10px] tracking-widest text-white/65">
            0{index + 1} / 03
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="plain"
            aria-label="Banner trước"
            aria-controls="hero-slide"
            onClick={() => go(-1)}
            className="grid size-11 place-items-center rounded-full border border-white/30 bg-white/5 backdrop-blur-sm transition hover:bg-white/15"
          >
            <MarketplaceIcon name="chevron" className="size-5 rotate-180" />
          </Button>
          <Button
            variant="ghost"
            size="plain"
            aria-label="Banner tiếp theo"
            aria-controls="hero-slide"
            onClick={() => go(1)}
            className="grid size-11 place-items-center rounded-full border border-white/30 bg-white/5 backdrop-blur-sm transition hover:bg-white/15"
          >
            <MarketplaceIcon name="chevron" className="size-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}
