import type { Product } from '../types/product.types';
export const products: Product[] = [
  {
    id: 'prd-101',
    name: 'Tai nghe không dây Nexus Air',
    sku: 'NX-AIR-01',
    category: 'Điện tử',
    price: 1290000,
    stock: 28,
    status: 'ACTIVE',
    updated: '18/10/2026',
  },
  {
    id: 'prd-102',
    name: 'Máy ảnh film Retro 35',
    sku: 'NX-CAM-35',
    category: 'Máy ảnh',
    price: 2450000,
    stock: 6,
    status: 'ACTIVE',
    updated: '17/10/2026',
  },
  {
    id: 'prd-103',
    name: 'Đèn bàn tối giản',
    sku: 'NX-LMP-02',
    category: 'Nhà cửa',
    price: 480000,
    stock: 0,
    status: 'DRAFT',
    updated: '16/10/2026',
  },
  {
    id: 'prd-104',
    name: 'Đồng hồ thể thao S2',
    sku: 'NX-WCH-S2',
    category: 'Điện tử',
    price: 890000,
    stock: 12,
    status: 'INACTIVE',
    updated: '12/10/2026',
  },
];

export const auctions = [
  {
    id: 'AUC-2041',
    product: 'Máy ảnh film Retro 35',
    start: '18/10/2026 · 09:00',
    end: '19/10/2026 · 09:00',
    bid: 2600000,
    bids: 14,
    status: 'Đang diễn ra',
  },
  {
    id: 'AUC-2042',
    product: 'Đồng hồ thể thao S2',
    start: '20/10/2026 · 19:00',
    end: '21/10/2026 · 19:00',
    bid: 950000,
    bids: 0,
    status: 'Sắp mở',
  },
  {
    id: 'AUC-2038',
    product: 'Loa Bluetooth Mini',
    start: '15/10/2026 · 10:00',
    end: '16/10/2026 · 10:00',
    bid: 720000,
    bids: 9,
    status: 'Đã kết thúc',
  },
];

export const orders = [
  {
    id: 'NX-ORD-8021',
    item: 'Tai nghe không dây Nexus Air',
    buyer: 'Minh Anh',
    date: '18/10/2026',
    total: 1290000,
    status: 'Chờ xác nhận',
  },
  {
    id: 'NX-ORD-8017',
    item: 'Máy ảnh film Retro 35',
    buyer: 'Quốc Bảo',
    date: '17/10/2026',
    total: 2450000,
    status: 'Đang giao',
  },
  {
    id: 'NX-ORD-8009',
    item: 'Đồng hồ thể thao S2',
    buyer: 'Thu Hà',
    date: '16/10/2026',
    total: 890000,
    status: 'Hoàn tất',
  },
];

export const inventory = [
  {
    sku: 'NX-AIR-01',
    product: 'Tai nghe không dây Nexus Air',
    warehouse: 'Kho Hồ Chí Minh',
    onHand: 28,
    reserved: 3,
    available: 25,
  },
  {
    sku: 'NX-CAM-35',
    product: 'Máy ảnh film Retro 35',
    warehouse: 'Kho Hà Nội',
    onHand: 6,
    reserved: 1,
    available: 5,
  },
  {
    sku: 'NX-LMP-02',
    product: 'Đèn bàn tối giản',
    warehouse: 'Kho Hồ Chí Minh',
    onHand: 0,
    reserved: 0,
    available: 0,
  },
];
