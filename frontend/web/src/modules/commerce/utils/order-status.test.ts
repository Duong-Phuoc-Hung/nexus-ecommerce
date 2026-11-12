import assert from 'node:assert/strict';
import test from 'node:test';
import { formatOrderStatus, getOrderStatusBadgeClass } from './order-status';

test('formatOrderStatus translates PENDING and PENDING_PAYMENT to CHỜ THANH TOÁN', () => {
  assert.equal(formatOrderStatus('PENDING'), 'CHỜ THANH TOÁN');
  assert.equal(formatOrderStatus('pending'), 'CHỜ THANH TOÁN');
  assert.equal(formatOrderStatus('PENDING_PAYMENT'), 'CHỜ THANH TOÁN');
  assert.equal(formatOrderStatus('pending_payment'), 'CHỜ THANH TOÁN');
  assert.equal(formatOrderStatus('CREATED'), 'CHỜ THANH TOÁN');
  assert.equal(formatOrderStatus(''), 'CHỜ THANH TOÁN');
  assert.equal(formatOrderStatus(undefined), 'CHỜ THANH TOÁN');
});

test('formatOrderStatus translates PAID to ĐÃ THANH TOÁN', () => {
  assert.equal(formatOrderStatus('PAID'), 'ĐÃ THANH TOÁN');
  assert.equal(formatOrderStatus('paid'), 'ĐÃ THANH TOÁN');
});

test('formatOrderStatus translates CANCELLED to ĐÃ HỦY', () => {
  assert.equal(formatOrderStatus('CANCELLED'), 'ĐÃ HỦY');
  assert.equal(formatOrderStatus('cancelled'), 'ĐÃ HỦY');
  assert.equal(formatOrderStatus('CANCELED'), 'ĐÃ HỦY');
});

test('formatOrderStatus translates PROCESSING, SHIPPED, DELIVERED to Vietnamese', () => {
  assert.equal(formatOrderStatus('PROCESSING'), 'ĐANG XỬ LÝ');
  assert.equal(formatOrderStatus('SHIPPED'), 'ĐANG GIAO HÀNG');
  assert.equal(formatOrderStatus('DELIVERED'), 'ĐÃ GIAO HÀNG');
});

test('formatOrderStatus handles timeline titles with status prefix', () => {
  assert.equal(
    formatOrderStatus('Trạng thái chuyển sang: PENDING'),
    'Trạng thái chuyển sang: CHỜ THANH TOÁN',
  );
  assert.equal(
    formatOrderStatus('Trạng thái chuyển sang: PAID'),
    'Trạng thái chuyển sang: ĐÃ THANH TOÁN',
  );
});

test('getOrderStatusBadgeClass returns appropriate style classes', () => {
  assert.ok(getOrderStatusBadgeClass('CANCELLED', true).includes('text-red-600'));
  assert.ok(getOrderStatusBadgeClass('EXPIRED').includes('text-red-600'));
  assert.ok(getOrderStatusBadgeClass('PAID', false, true).includes('text-emerald-700'));
  assert.ok(getOrderStatusBadgeClass('PAID').includes('text-emerald-700'));
  assert.ok(getOrderStatusBadgeClass('PENDING').includes('text-amber-800'));
  assert.ok(getOrderStatusBadgeClass('PENDING_PAYMENT').includes('text-amber-800'));
});
