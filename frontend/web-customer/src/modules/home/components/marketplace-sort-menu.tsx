'use client';

import { useEffect, useRef } from 'react';
import { MarketplaceIcon } from './marketplace-icon';

const options = [
  { value: 'featured', label: 'Nổi bật', hint: 'Lựa chọn từ Nexus' },
  { value: 'price-asc', label: 'Giá thấp đến cao', hint: 'Ưu tiên mức giá dễ tiếp cận' },
  { value: 'price-desc', label: 'Giá cao đến thấp', hint: 'Ưu tiên sản phẩm giá trị cao' },
  { value: 'popular', label: 'Được quan tâm', hint: 'Theo số lượt mua mẫu' },
];

export function MarketplaceSortMenu({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const summary = useRef<HTMLElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (details.current?.open && !details.current.contains(event.target as Node))
        details.current.open = false;
    }
    function escape(event: KeyboardEvent) {
      if (event.key === 'Escape' && details.current?.open) {
        details.current.open = false;
        summary.current?.focus();
      }
    }
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, []);

  return (
    <details ref={details} className="group/sort relative z-20 ml-auto shrink-0">
      <summary
        ref={summary}
        aria-label={`Sắp xếp sản phẩm: ${selected.label}`}
        title="Sắp xếp sản phẩm"
        className={`grid size-11 cursor-pointer list-none place-items-center rounded-xl border transition [&::-webkit-details-marker]:hidden group-open/sort:border-brand/30 group-open/sort:bg-brand-soft group-open/sort:text-brand-dark ${value === 'featured' ? 'border-line bg-white text-ink hover:border-brand/30 hover:bg-brand-soft' : 'border-brand/20 bg-brand-soft text-brand-dark'}`}
      >
        <MarketplaceIcon name="sliders" className="size-5" />
      </summary>
      <div className="sort-dropdown absolute right-0 top-[calc(100%_+_10px)] w-64 overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-[0_12px_40px_#24232918]">
        <p className="px-3 pb-2 pt-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted">
          Sắp xếp theo
        </p>
        <div
          role="group"
          aria-label="Lựa chọn sắp xếp"
          onKeyDown={(event) => {
            if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>('button'),
            );
            const index = buttons.indexOf(event.target as HTMLButtonElement);
            const next =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? buttons.length - 1
                  : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
                    buttons.length;
            event.preventDefault();
            buttons[next]?.focus();
          }}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={value === option.value}
              onClick={() => {
                onChange(option.value);
                if (details.current) details.current.open = false;
                summary.current?.focus();
              }}
              className={`flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition ${value === option.value ? 'bg-brand-soft text-brand-dark' : 'text-ink hover:bg-stone-50'}`}
            >
              <span>
                <span className="block text-xs font-semibold">{option.label}</span>
                <span className="mt-1 block text-[10px] font-normal text-muted">{option.hint}</span>
              </span>
              {value === option.value && (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-dark text-white">
                  <MarketplaceIcon name="check" className="size-3" />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </details>
  );
}
