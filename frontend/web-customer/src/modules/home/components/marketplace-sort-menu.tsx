'use client';

import { MarketplaceIcon } from './marketplace-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

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
  const selected = options.find((option) => option.value === value) ?? options[0];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Sắp xếp sản phẩm: ${selected.label}`}
          title="Sắp xếp sản phẩm"
          className={`ml-auto grid size-11 shrink-0 place-items-center rounded-xl border transition data-[state=open]:border-brand/40 data-[state=open]:bg-brand-soft data-[state=open]:text-brand-dark ${value === 'featured' ? 'border-line bg-white text-ink hover:border-brand/30 hover:bg-brand-soft' : 'border-brand/25 bg-brand-soft text-brand-dark'}`}
        >
          <MarketplaceIcon name="sliders" className="size-5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        collisionPadding={16}
        className="w-72 max-w-[calc(100vw-2rem)] rounded-2xl border-line bg-white p-2 shadow-[0_12px_40px_#24232918]"
      >
        <DropdownMenuLabel className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.15em] text-muted">
          Sắp xếp theo
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-1 bg-line" />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="min-h-16 cursor-pointer rounded-xl py-3 pl-9 pr-3 text-ink focus:bg-brand-soft focus:text-brand-dark data-[state=checked]:bg-brand-soft data-[state=checked]:text-brand-dark"
            >
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span className="mt-1 block text-xs text-muted">{option.hint}</span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
