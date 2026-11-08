import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from './app';
import { HttpSellerEligibilityChecker } from './infrastructure/clients/HttpSellerEligibilityChecker';

async function withSellerWorkflowServer<T>(
  run: (ctx: { baseUrl: string; eligibilityChecker: HttpSellerEligibilityChecker }) => Promise<T>,
): Promise<T> {
  process.env.NODE_ENV = 'test';
  process.env.USE_IN_MEMORY_DB = 'true';
  process.env.BOOTSTRAP_ADMIN_EMAIL = 'admin.test@nexus-ecommerce.com';
  process.env.BOOTSTRAP_ADMIN_PASSWORD = 'AdminPassword123!';

  const eligibilityChecker = new HttpSellerEligibilityChecker({
    commerceBaseUrl: 'http://127.0.0.1:59998',
    auctionBaseUrl: 'http://127.0.0.1:59999',
    timeoutMs: 500,
  });

  const server = createApplication({ eligibilityChecker }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');

  try {
    return await run({
      baseUrl: `http://127.0.0.1:${address.port}`,
      eligibilityChecker,
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function loginAs(
  baseUrl: string,
  email: string,
  password: string,
): Promise<{ token: string; user: any }> {
  const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(res.status, 200, `Login failed for ${email}`);
  const json = (await res.json()) as any;
  return {
    token: json.data.accessToken,
    user: json.data.user,
  };
}

const VALID_APPLICATION_PAYLOAD = {
  shopName: 'Nexus Heritage Collectibles',
  contactName: 'Nguyen Van Buyer',
  contactPhone: '0901234567',
  pickupAddress: {
    provinceCode: '79',
    provinceName: 'TP. Hồ Chí Minh',
    wardCode: '26734',
    wardName: 'Phường Bến Nghé',
    street: 'Số 123 Đường Nguyễn Huệ, Quận 1',
    note: 'Tầng 3 tòa nhà thương mại',
  },
  categoryIds: ['cat_collectibles', 'cat_electronics'],
  categoryNames: ['Đồ sưu tầm & Đấu giá', 'Thiết bị điện tử'],
  shopDescription: 'Chuyên cung cấp thiết bị âm thanh cổ điển và đồ sưu tầm chính hãng.',
  acceptedTerms: true,
};

test('Full Seller Registration -> Admin Review -> Eligibility Check -> Seller Activation Workflow (16 SRS/MVP Acceptance Scenarios)', async () => {
  await withSellerWorkflowServer(async ({ baseUrl, eligibilityChecker }) => {
    const buyerAuth = await loginAs(baseUrl, 'buyer.test@nexus-ecommerce.com', 'Password123!');
    const staffAuth = await loginAs(baseUrl, 'staff.test@nexus-ecommerce.com', 'Password123!');
    const adminAuth = await loginAs(baseUrl, 'admin.test@nexus-ecommerce.com', 'AdminPassword123!');

    // -------------------------------------------------------------------------
    // Scenario 1: Buyer chưa có hồ sơ xem được trạng thái ban đầu (application: null)
    // -------------------------------------------------------------------------
    const meInitialRes = await fetch(`${baseUrl}/api/v1/seller-applications/me`, {
      headers: { Authorization: `Bearer ${buyerAuth.token}` },
    });
    assert.equal(meInitialRes.status, 200);
    const meInitialJson = (await meInitialRes.json()) as any;
    assert.equal(meInitialJson.data.application, null);
    assert.equal(meInitialJson.data.accountRole, 'BUYER');
    assert.deepEqual(meInitialJson.data.allowedActions, ['SUBMIT']);

    // -------------------------------------------------------------------------
    // Scenario 2: Validate trường bắt buộc (422 VALIDATION_ERROR) & gửi thành công -> PENDING
    // -------------------------------------------------------------------------
    const invalidSubmitRes = await fetch(`${baseUrl}/api/v1/seller-applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerAuth.token}`,
      },
      body: JSON.stringify({
        shopName: 'A',
        contactPhone: 'invalid-phone',
        acceptedTerms: false,
      }),
    });
    assert.equal(invalidSubmitRes.status, 422);
    const invalidSubmitJson = (await invalidSubmitRes.json()) as any;
    assert.equal(invalidSubmitJson.code, 'VALIDATION_ERROR');
    assert.ok(invalidSubmitJson.fieldErrors.shopName);
    assert.ok(invalidSubmitJson.fieldErrors.contactPhone);
    assert.ok(invalidSubmitJson.fieldErrors.acceptedTerms);

    const validSubmitRes = await fetch(`${baseUrl}/api/v1/seller-applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerAuth.token}`,
      },
      body: JSON.stringify(VALID_APPLICATION_PAYLOAD),
    });
    assert.equal(validSubmitRes.status, 201);
    const createdApp = ((await validSubmitRes.json()) as any).data;
    assert.equal(createdApp.status, 'PENDING');
    assert.equal(createdApp.version, 1);
    assert.equal(createdApp.snapshot.contactEmail, 'buyer.test@nexus-ecommerce.com');
    const appId = createdApp.id as string;

    // -------------------------------------------------------------------------
    // Scenario 3: Buyer có hồ sơ PENDING không tạo được hồ sơ trùng (409) & vẫn giữ role BUYER
    // -------------------------------------------------------------------------
    const duplicateRes = await fetch(`${baseUrl}/api/v1/seller-applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerAuth.token}`,
      },
      body: JSON.stringify(VALID_APPLICATION_PAYLOAD),
    });
    assert.equal(duplicateRes.status, 409);
    assert.equal(((await duplicateRes.json()) as any).code, 'DUPLICATE_ACTIVE_APPLICATION');

    const profileWhilePendingRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${buyerAuth.token}` },
    });
    assert.equal(profileWhilePendingRes.status, 200);
    assert.equal(((await profileWhilePendingRes.json()) as any).data.role, 'BUYER');

    // -------------------------------------------------------------------------
    // Scenario 15 (Part A): BUYER & SUPPORT_STAFF bị chặn 403 khi gọi API Admin
    // -------------------------------------------------------------------------
    const buyerAdminCall = await fetch(`${baseUrl}/api/v1/admin/seller-applications`, {
      headers: { Authorization: `Bearer ${buyerAuth.token}` },
    });
    assert.equal(buyerAdminCall.status, 403);

    const staffAdminCall = await fetch(`${baseUrl}/api/v1/admin/seller-applications`, {
      headers: { Authorization: `Bearer ${staffAuth.token}` },
    });
    assert.equal(staffAdminCall.status, 403);

    const staffApproveCall = await fetch(
      `${baseUrl}/api/v1/admin/seller-applications/${appId}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffAuth.token}`,
        },
        body: JSON.stringify({ expectedVersion: 1 }),
      },
    );
    assert.equal(staffApproveCall.status, 403);

    // -------------------------------------------------------------------------
    // Scenario 4: Admin tìm/lọc và xem chi tiết hồ sơ PENDING
    // -------------------------------------------------------------------------
    const adminListRes = await fetch(
      `${baseUrl}/api/v1/admin/seller-applications?status=PENDING&q=Heritage`,
      {
        headers: { Authorization: `Bearer ${adminAuth.token}` },
      },
    );
    assert.equal(adminListRes.status, 200);
    const adminListJson = (await adminListRes.json()) as any;
    assert.equal(adminListJson.data.length, 1);
    assert.equal(adminListJson.data[0].id, appId);
    assert.equal(adminListJson.summary.pendingCount, 1);

    const adminDetailRes = await fetch(`${baseUrl}/api/v1/admin/seller-applications/${appId}`, {
      headers: { Authorization: `Bearer ${adminAuth.token}` },
    });
    assert.equal(adminDetailRes.status, 200);
    const adminDetailJson = (await adminDetailRes.json()) as any;
    assert.equal(adminDetailJson.data.id, appId);
    assert.ok(adminDetailJson.data.allowedActions.includes('APPROVE'));
    assert.ok(adminDetailJson.data.allowedActions.includes('REJECT'));

    // -------------------------------------------------------------------------
    // Scenario 5: Admin từ chối bắt buộc có lý do; không lộ internalNote cho Buyer; Buyer gửi lại v2
    // -------------------------------------------------------------------------
    const rejectWithoutReasonRes = await fetch(
      `${baseUrl}/api/v1/admin/seller-applications/${appId}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`,
        },
        body: JSON.stringify({ reason: 'abc', expectedVersion: 1 }),
      },
    );
    assert.equal(rejectWithoutReasonRes.status, 422);

    const rejectSuccessRes = await fetch(
      `${baseUrl}/api/v1/admin/seller-applications/${appId}/reject`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`,
        },
        body: JSON.stringify({
          reason: 'Vui lòng bổ sung số tầng và tòa nhà cụ thể tại địa chỉ lấy hàng.',
          internalNote: 'SECRET_ADMIN_NOTE_DO_NOT_EXPOSE_TO_BUYER',
          expectedVersion: 1,
        }),
      },
    );
    assert.equal(rejectSuccessRes.status, 200);
    const rejectedAdminDto = ((await rejectSuccessRes.json()) as any).data;
    assert.equal(rejectedAdminDto.status, 'REJECTED');
    assert.equal(rejectedAdminDto.version, 2);

    // Buyer checks /me -> sees rejectionReason, does NOT see internalNote
    const buyerAfterRejectRes = await fetch(`${baseUrl}/api/v1/seller-applications/me`, {
      headers: { Authorization: `Bearer ${buyerAuth.token}` },
    });
    const buyerAfterRejectBody = await buyerAfterRejectRes.text();
    assert.ok(
      !buyerAfterRejectBody.includes('SECRET_ADMIN_NOTE_DO_NOT_EXPOSE_TO_BUYER'),
      'Internal note của Admin tuyệt đối không được lộ trong phản hồi của Buyer',
    );
    const buyerAfterRejectJson = JSON.parse(buyerAfterRejectBody);
    assert.equal(buyerAfterRejectJson.data.application.status, 'REJECTED');
    assert.equal(
      buyerAfterRejectJson.data.application.rejectionReason,
      'Vui lòng bổ sung số tầng và tòa nhà cụ thể tại địa chỉ lấy hàng.',
    );

    // Buyer resubmits -> v3 PENDING
    const resubmitRes = await fetch(`${baseUrl}/api/v1/seller-applications/${appId}/resubmit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerAuth.token}`,
      },
      body: JSON.stringify({
        ...VALID_APPLICATION_PAYLOAD,
        shopName: 'Nexus Heritage Collectibles Official',
        expectedVersion: 2,
      }),
    });
    assert.equal(resubmitRes.status, 200);
    const resubmittedDto = ((await resubmitRes.json()) as any).data;
    assert.equal(resubmittedDto.status, 'PENDING');
    assert.equal(resubmittedDto.version, 3);
    assert.equal(resubmittedDto.versions.length, 2);

    // -------------------------------------------------------------------------
    // Scenario 6: Buyer rút hồ sơ PENDING (WITHDRAWN), sửa và gửi lại được (v5 PENDING)
    // -------------------------------------------------------------------------
    const withdrawRes = await fetch(`${baseUrl}/api/v1/seller-applications/${appId}/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${buyerAuth.token}`,
      },
      body: JSON.stringify({
        expectedVersion: 3,
        reason: 'Cập nhật lại số điện thoại kho hàng',
      }),
    });
    assert.equal(withdrawRes.status, 200);
    const withdrawnDto = ((await withdrawRes.json()) as any).data;
    assert.equal(withdrawnDto.status, 'WITHDRAWN');
    assert.equal(withdrawnDto.version, 4);

    const resubmitAfterWithdrawRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/resubmit`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerAuth.token}`,
        },
        body: JSON.stringify({
          ...VALID_APPLICATION_PAYLOAD,
          contactPhone: '0987654321',
          expectedVersion: 4,
        }),
      },
    );
    assert.equal(resubmitAfterWithdrawRes.status, 200);
    const pendingV5 = ((await resubmitAfterWithdrawRes.json()) as any).data;
    assert.equal(pendingV5.status, 'PENDING');
    assert.equal(pendingV5.version, 5);

    // -------------------------------------------------------------------------
    // Scenario 7 & 11 (Part A): Admin duyệt hồ sơ chuyển APPROVED (v6), CHƯA đổi role sang SELLER!
    // Đồng thời kiểm tra optimistic locking (expectedVersion sai -> 409 VERSION_CONFLICT).
    // -------------------------------------------------------------------------
    const staleApproveRes = await fetch(
      `${baseUrl}/api/v1/admin/seller-applications/${appId}/approve`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`,
        },
        body: JSON.stringify({ expectedVersion: 2 }),
      },
    );
    assert.equal(staleApproveRes.status, 409);
    assert.equal(((await staleApproveRes.json()) as any).code, 'VERSION_CONFLICT');

    const approveRes = await fetch(`${baseUrl}/api/v1/admin/seller-applications/${appId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`,
      },
      body: JSON.stringify({
        expectedVersion: 5,
        internalNote: 'Hồ sơ hợp lệ sau khi cập nhật SĐT.',
      }),
    });
    assert.equal(approveRes.status, 200);
    const approvedDto = ((await approveRes.json()) as any).data;
    assert.equal(approvedDto.status, 'APPROVED');
    assert.equal(approvedDto.version, 6);

    // Verify user role is STILL BUYER after Admin approval!
    const profileAfterApproveRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${buyerAuth.token}` },
    });
    assert.equal(profileAfterApproveRes.status, 200);
    assert.equal(
      ((await profileAfterApproveRes.json()) as any).data.role,
      'BUYER',
      'Admin duyệt hồ sơ tuyệt đối chưa đổi role sang SELLER trước khi Buyer kích hoạt',
    );

    // -------------------------------------------------------------------------
    // Scenario 8: Buyer kiểm tra eligibility khi còn đơn mua chưa hoàn tất -> bị chặn
    // -------------------------------------------------------------------------
    eligibilityChecker.setUserOrderObligations(buyerAuth.user.id, [
      {
        orderId: 'ord_pending_001',
        orderNumber: '#ORD-001',
        buyerId: buyerAuth.user.id,
        status: 'SHIPPED',
      },
    ]);

    const eligWithOrderRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activation-eligibility`,
      {
        headers: { Authorization: `Bearer ${buyerAuth.token}` },
      },
    );
    assert.equal(eligWithOrderRes.status, 200);
    const eligWithOrderJson = ((await eligWithOrderRes.json()) as any).data;
    assert.equal(eligWithOrderJson.eligible, false);
    assert.equal(eligWithOrderJson.blockers[0].code, 'OPEN_BUYER_ORDER');
    assert.equal(eligWithOrderJson.blockers[0].referenceType, 'ORDER');
    assert.equal(eligWithOrderJson.blockers[0].referenceId, 'ord_pending_001');

    // Attempt to activate while order is open -> 422 ACTIVATION_BLOCKED
    const activateBlockedByOrderRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerAuth.token}`,
        },
        body: JSON.stringify({
          expectedVersion: 6,
          idempotencyKey: 'idem_blocked_order',
        }),
      },
    );
    assert.equal(activateBlockedByOrderRes.status, 422);
    assert.equal(((await activateBlockedByOrderRes.json()) as any).code, 'ACTIVATION_BLOCKED');

    // Clear order obligation
    eligibilityChecker.setUserOrderObligations(buyerAuth.user.id, []);

    // -------------------------------------------------------------------------
    // Scenario 9: Buyer kiểm tra eligibility khi còn tham gia phiên đấu giá đang mở -> bị chặn
    // -------------------------------------------------------------------------
    eligibilityChecker.setUserAuctionObligations(buyerAuth.user.id, [
      {
        auctionId: 'auc_open_999',
        title: 'Đồng hồ Omega Seamaster 1968',
        bidderId: buyerAuth.user.id,
        type: 'PARTICIPATING_ACTIVE_AUCTION',
      },
    ]);

    const eligWithAuctionRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activation-eligibility`,
      {
        headers: { Authorization: `Bearer ${buyerAuth.token}` },
      },
    );
    assert.equal(eligWithAuctionRes.status, 200);
    const eligWithAuctionJson = ((await eligWithAuctionRes.json()) as any).data;
    assert.equal(eligWithAuctionJson.eligible, false);
    assert.equal(eligWithAuctionJson.blockers[0].code, 'PARTICIPATING_ACTIVE_AUCTION');
    assert.equal(eligWithAuctionJson.blockers[0].referenceType, 'AUCTION');
    assert.equal(eligWithAuctionJson.blockers[0].referenceId, 'auc_open_999');

    eligibilityChecker.setUserAuctionObligations(buyerAuth.user.id, []);

    // -------------------------------------------------------------------------
    // Scenario 10: Dịch vụ nghĩa vụ lỗi/timeout -> không mặc định đủ điều kiện (503)
    // -------------------------------------------------------------------------
    eligibilityChecker.setSimulateServiceFailure(true);

    const eligUnavailableRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activation-eligibility`,
      {
        headers: { Authorization: `Bearer ${buyerAuth.token}` },
      },
    );
    assert.equal(eligUnavailableRes.status, 200);
    const eligUnavailableJson = ((await eligUnavailableRes.json()) as any).data;
    assert.equal(eligUnavailableJson.eligible, false);
    assert.equal(eligUnavailableJson.serviceAvailable, false);
    assert.equal(eligUnavailableJson.blockers[0].code, 'OBLIGATION_SERVICE_UNAVAILABLE');

    const activateWhenUnavailableRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerAuth.token}`,
        },
        body: JSON.stringify({
          expectedVersion: 6,
          idempotencyKey: 'idem_service_down',
        }),
      },
    );
    assert.equal(activateWhenUnavailableRes.status, 503);
    assert.equal(
      ((await activateWhenUnavailableRes.json()) as any).code,
      'OBLIGATION_SERVICE_UNAVAILABLE',
    );

    eligibilityChecker.setSimulateServiceFailure(false);

    // -------------------------------------------------------------------------
    // Scenario 12: Khi đủ điều kiện -> Buyer xác nhận kích hoạt thành công (ACTIVATED + SELLER)
    // Giải phóng checkout reservation, thu hồi token Buyer cũ, hỗ trợ Idempotency-Key!
    // -------------------------------------------------------------------------
    eligibilityChecker.addCheckoutReservation(buyerAuth.user.id);
    assert.equal(eligibilityChecker.hasCheckoutReservation(buyerAuth.user.id), true);

    const activateSuccessRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${buyerAuth.token}`,
          'Idempotency-Key': 'idem_activate_success_001',
        },
        body: JSON.stringify({
          expectedVersion: 6,
        }),
      },
    );
    assert.equal(activateSuccessRes.status, 200);
    const activationData = ((await activateSuccessRes.json()) as any).data;
    assert.equal(activationData.application.status, 'ACTIVATED');
    assert.equal(activationData.user.role, 'SELLER');
    assert.ok(activationData.accessToken);
    assert.ok(activationData.user.permissions.includes('PRODUCT.CREATE'));
    assert.ok(!activationData.user.permissions.includes('CART.VIEW'));
    assert.ok(!activationData.user.permissions.includes('AUCTION.BID'));

    // Checkout reservation must be released
    assert.equal(eligibilityChecker.hasCheckoutReservation(buyerAuth.user.id), false);

    // Old Buyer token must be revoked (401)
    const oldTokenProfileRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${buyerAuth.token}` },
    });
    assert.equal(
      oldTokenProfileRes.status,
      401,
      'Token BUYER cũ phải bị thu hồi ngay khi kích hoạt SELLER',
    );

    // New Seller token works and returns role = SELLER
    const newSellerToken = activationData.accessToken as string;
    const newTokenProfileRes = await fetch(`${baseUrl}/api/v1/users/profile`, {
      headers: { Authorization: `Bearer ${newSellerToken}` },
    });
    assert.equal(newTokenProfileRes.status, 200);
    assert.equal(((await newTokenProfileRes.json()) as any).data.role, 'SELLER');

    // Idempotent retry with same Idempotency-Key returns 200 with same valid SELLER result
    const idempotentRetryRes = await fetch(
      `${baseUrl}/api/v1/seller-applications/${appId}/activate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${newSellerToken}`,
          'Idempotency-Key': 'idem_activate_success_001',
        },
        body: JSON.stringify({ expectedVersion: 6 }),
      },
    );
    assert.equal(idempotentRetryRes.status, 200);
    assert.equal(((await idempotentRetryRes.json()) as any).data.user.role, 'SELLER');

    // Admin cannot revoke approval after ACTIVATED
    const revokeAfterActivatedRes = await fetch(
      `${baseUrl}/api/v1/admin/seller-applications/${appId}/revoke-approval`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminAuth.token}`,
        },
        body: JSON.stringify({
          reason: 'Thử thu hồi sau khi đã kích hoạt',
          expectedVersion: 7,
        }),
      },
    );
    assert.equal(revokeAfterActivatedRes.status, 409);

    // -------------------------------------------------------------------------
    // Scenario 14: Không hỗ trợ tự chuyển ngược SELLER -> BUYER trong MVP
    // & Chặn đổi BUYER -> SELLER qua dropdown chung
    // -------------------------------------------------------------------------
    const downgradeToBuyerRes = await fetch(`${baseUrl}/api/v1/users/${buyerAuth.user.id}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminAuth.token}`,
      },
      body: JSON.stringify({ role: 'BUYER' }),
    });
    assert.equal(downgradeToBuyerRes.status, 422);
    assert.equal(((await downgradeToBuyerRes.json()) as any).code, 'ROLE_POLICY_VIOLATION');
  });
});
