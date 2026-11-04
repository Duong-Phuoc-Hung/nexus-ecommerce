export type ShippingAddress = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  provinceCode?: string;
  province: string;
  wardCode?: string;
  ward: string;
  street: string;
  note: string;
  isDefault: boolean;
};

export type AddressInput = Omit<ShippingAddress, 'id' | 'isDefault'>;

export const ADDRESS_CHANGE_EVENT = 'nexus-address-change';
const addressKey = (userId: string) => `nexus-addresses-v1:${userId}`;
const phoneKey = (userId: string) => `nexus-contact-phone-v1:${userId}`;

export function readAddresses(userId: string): ShippingAddress[] {
  if (typeof window === 'undefined' || !userId) return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(addressKey(userId)) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is ShippingAddress =>
            item !== null &&
            typeof item === 'object' &&
            typeof item.id === 'string' &&
            typeof item.recipientName === 'string' &&
            typeof item.phone === 'string' &&
            typeof item.province === 'string' &&
            typeof item.street === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

function writeAddresses(userId: string, addresses: ShippingAddress[]) {
  localStorage.setItem(addressKey(userId), JSON.stringify(addresses));
  window.dispatchEvent(new Event(ADDRESS_CHANGE_EVENT));
}

export function saveContactPhone(userId: string, phone: string) {
  if (typeof window === 'undefined' || !userId) return;
  try {
    localStorage.setItem(phoneKey(userId), phone);
  } catch {
    // A blocked browser store must not turn a successful registration into an auth failure.
  }
}

export function readContactPhone(userId: string) {
  if (typeof window === 'undefined' || !userId) return '';
  try {
    return localStorage.getItem(phoneKey(userId)) || '';
  } catch {
    return '';
  }
}

export function saveAddress(
  userId: string,
  input: AddressInput,
  options: { id?: string; makeDefault?: boolean } = {},
) {
  const current = readAddresses(userId);
  if (!options.id && current.length >= 5) throw new Error('Bạn có thể lưu tối đa 5 địa chỉ.');
  const id = options.id ?? crypto.randomUUID();
  const isDefault = options.makeDefault || current.length === 0;
  const entry: ShippingAddress = {
    ...input,
    id,
    isDefault: Boolean(isDefault || current.find((item) => item.id === id)?.isDefault),
  };
  const next = options.id
    ? current.map((item) => (item.id === id ? entry : item))
    : [...current, entry];
  writeAddresses(
    userId,
    entry.isDefault ? next.map((item) => ({ ...item, isDefault: item.id === id })) : next,
  );
  return entry;
}

export function setDefaultAddress(userId: string, id: string) {
  const current = readAddresses(userId);
  if (!current.some((item) => item.id === id)) return;
  writeAddresses(
    userId,
    current.map((item) => ({ ...item, isDefault: item.id === id })),
  );
}

export function deleteAddress(userId: string, id: string) {
  const current = readAddresses(userId);
  const next = current.filter((item) => item.id !== id);
  if (current.find((item) => item.id === id)?.isDefault && next[0]) next[0].isDefault = true;
  writeAddresses(userId, next);
}

export function formatAddress(address: ShippingAddress) {
  return [address.street, address.ward, address.province].filter(Boolean).join(', ');
}
