'use client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
type Props = {
  id: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  disabled?: boolean;
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
};
export function AdminSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Chọn một giá trị',
  disabled,
  ...aria
}: Props) {
  return (
    <Select
      value={value || '__empty'}
      onValueChange={(next) => onValueChange(next === '__empty' ? '' : next)}
      disabled={disabled}
    >
      <SelectTrigger id={id} className="admin-select-trigger min-h-11 w-full" {...aria}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="admin-select-content">
        <SelectItem value="__empty">{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
