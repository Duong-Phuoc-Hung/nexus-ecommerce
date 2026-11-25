import crypto from 'node:crypto';
import { ExpiredOrderCleanupWorker } from '../../../infrastructure/workers/ExpiredOrderCleanupWorker';
import { Request, Response, Router } from 'express';
import { Pool } from 'pg';
import {
  AuthenticatedRequest,
  requireAuth,
  requireScopedServiceOnly,
} from '../../../infrastructure/security/auth';
import { buildServiceAuthHeader } from '../../../infrastructure/security/internal-service-auth';
import { PayOsGateway } from '../../../infrastructure/clients/PayOsGateway';

interface AuthoritativeAuctionSettlement {
  auctionId: string;
  status: string;
  productId: string;
  productTitle: string;
  sellerId: string;
  highestBidderId: string | null;
  winningAmount: number;
  endTime: string;
  paymentDueAt: string;
  settlementStatus: string;
  orderId: string | null;
}

async function fetchAuthoritativeSettlement(
  auctionId: string,
  buyerId: string,
): Promise<
  | { ok: true; settlement: AuthoritativeAuctionSettlement }
  | { ok: false; status: number; code: string; error: string }
> {
  const auctionUrl = (
    process.env.AUCTION_SERVICE_URL ||
    `http://127.0.0.1:${process.env.AUCTION_SERVICE_PORT || 4004}`
  ).replace(/\/$/, '');

  try {
    const res = await fetch(
      `${auctionUrl}/api/v1/auctions/internal/settlement/${encodeURIComponent(auctionId)}`,
      {
        method: 'GET',
        headers: buildServiceAuthHeader({
          issuer: 'commerce-service',
          audience: 'auction-service',
          scope: 'auction:settlement:read',
          resource: auctionId,
          actor: { sub: buyerId, role: 'BUYER' },
        }),
        signal: AbortSignal.timeout(4000),
      },
    );
    if (res.status === 404) {
      return {
        ok: false,
        status: 404,
        code: 'AUCTION_NOT_FOUND',
        error: 'Không tìm thấy phiên đấu giá tương ứng.',
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        status: 503,
        code: 'AUCTION_SERVICE_UNAVAILABLE',
        error: `Không thể xác minh kết quả đấu giá từ Auction Service (HTTP ${res.status}).`,
      };
    }
    const json = (await res.json()) as { success?: boolean; data?: AuthoritativeAuctionSettlement };
    if (!json?.success || !json.data) {
      return {
        ok: false,
        status: 503,
        code: 'AUCTION_SETTLEMENT_INVALID',
        error: 'Phản hồi xác minh phiên đấu giá không hợp lệ.',
      };
    }
    return { ok: true, settlement: json.data };
  } catch {
    return {
      ok: false,
      status: 503,
      code: 'AUCTION_SERVICE_UNAVAILABLE',
      error: 'Không thể kết nối Auction Service để xác minh kết quả thắng phiên.',
    };
  }
}

function buildAuctionOrderCode(): string {
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `ORD-AUC-${ymd}-${rand}`;
}

export function createAuctionOrderRoutes(pool: Pool): Router {
  const router = Router();
  const payOs = new PayOsGateway();
  const expiryWorker = new ExpiredOrderCleanupWorker(undefined, 15, payOs);

  // POST /api/v1/orders/from-auction — Tạo đơn duy nhất từ phiên đấu giá thắng cuộc
  router.post('/orders/from-auction', requireAuth, async (req: Request, res: Response) => {
    try {
      const user = (req as AuthenticatedRequest).user;
      if (!user || user.role !== 'BUYER') {
        res.status(403).json({
          success: false,
          error: 'Chỉ tài khoản Buyer thắng đấu giá mới được tạo đơn thanh toán.',
        });
        return;
      }

      const b = req.body || {};
      const auctionId = String(b.auctionId || '').trim();
      const sellerName = String(b.sellerName || 'Người bán Nexus').trim();
      const shippingAddress = b.shippingAddress || {};

      if (!auctionId) {
        res.status(400).json({
          success: false,
          code: 'INVALID_AUCTION_ID',
          error: 'Thiếu mã phiên đấu giá (auctionId).',
        });
        return;
      }

      // SEC-06: Xác minh kết quả thắng phiên có thẩm quyền trực tiếp từ Auction Service.
      // Tuyệt đối KHÔNG tin tưởng amount, productId, sellerId hay hạn thanh toán do client gửi.
      const verified = await fetchAuthoritativeSettlement(auctionId, user.sub);
      if (!verified.ok) {
        res.status(verified.status).json({
          success: false,
          code: verified.code,
          error: verified.error,
        });
        return;
      }

      const settlement = verified.settlement;
      if (!['ENDED', 'SETTLED'].includes(String(settlement.status || '').toUpperCase())) {
        res.status(409).json({
          success: false,
          code: 'AUCTION_NOT_ENDED',
          error: `Phiên đấu giá chưa kết thúc (trạng thái hiện tại: ${settlement.status}).`,
        });
        return;
      }
      if (!settlement.highestBidderId || settlement.highestBidderId !== user.sub) {
        res.status(403).json({
          success: false,
          code: 'AUCTION_WINNER_MISMATCH',
          error: 'Tài khoản hiện tại không phải người chiến thắng phiên đấu giá này.',
        });
        return;
      }
      const dueDate = new Date(settlement.paymentDueAt);
      if (
        String(settlement.settlementStatus || '').toUpperCase() === 'TIMEOUT_PENALIZED' ||
        Number.isNaN(dueDate.getTime()) ||
        Date.now() >= dueDate.getTime()
      ) {
        res.status(410).json({
          success: false,
          code: 'AUCTION_PAYMENT_EXPIRED',
          error: 'Đã quá thời hạn thanh toán 24 giờ cho phiên đấu giá này.',
        });
        return;
      }

      const amount = Math.round(Number(settlement.winningAmount || 0));
      const productId = String(settlement.productId || '').trim();
      const productTitle = String(
        settlement.productTitle || `Sản phẩm đấu giá #${productId}`,
      ).trim();
      const sellerId = String(settlement.sellerId || '').trim();
      if (!productId || !sellerId || !Number.isFinite(amount) || amount <= 0) {
        res.status(422).json({
          success: false,
          code: 'AUCTION_SETTLEMENT_INCOMPLETE',
          error: 'Dữ liệu chốt phiên đấu giá không đầy đủ để khởi tạo đơn thanh toán.',
        });
        return;
      }

      // 1. Idempotency theo auctionId: nếu đã có đơn chưa hủy thì trả về luôn đơn cũ
      const existing = await pool.query(
        `SELECT o.id, o.order_code, o.total_amount, o.status,
                p.payment_link_id, p.checkout_url, p.status AS payment_status, p.qr_code
         FROM commerce_orders o
         LEFT JOIN LATERAL (
           SELECT payment_link_id, checkout_url, status, qr_code
           FROM commerce_payments
           WHERE order_id = o.id
           ORDER BY id DESC
           LIMIT 1
         ) p ON true
         WHERE o.auction_id = $1 AND o.buyer_id = $2 AND UPPER(o.status) <> 'CANCELLED'
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [auctionId, user.sub],
      );

      if (existing.rows.length > 0) {
        const row = existing.rows[0];
        let paymentLinkId: string | undefined = row.payment_link_id || undefined;
        let checkoutUrl: string = row.checkout_url || '';
        let qrCode: string | undefined = row.qr_code || undefined;
        let paymentStatus: string = String(row.payment_status || 'PENDING').toUpperCase();
        const orderStatus: string = String(row.status || 'PENDING_PAYMENT').toUpperCase();

        // Nếu đơn vẫn đang PENDING_PAYMENT, kiểm tra trạng thái link trên PayOS:
        // - Nếu đã PAID trên PayOS -> cập nhật đơn và trả về PAID
        // - Nếu link đã CANCELLED/EXPIRED hoặc chưa có checkoutUrl -> tự cấp lại link PayOS mới trong hạn 24h
        if (
          orderStatus === 'PENDING_PAYMENT' &&
          paymentStatus !== 'PAID' &&
          paymentStatus !== 'SUCCEEDED'
        ) {
          const latestPay = await pool.query(
            `SELECT id, payos_order_code, status, checkout_url, payment_link_id, qr_code
             FROM commerce_payments
             WHERE order_id = $1
             ORDER BY id DESC
             LIMIT 1`,
            [row.id],
          );
          const payRec = latestPay.rows[0];
          let needsNewLink =
            !checkoutUrl || paymentStatus === 'CANCELLED' || paymentStatus === 'FAILED';

          if (payRec?.payos_order_code && payOs.isConfigured()) {
            try {
              const remote = await payOs.getPaymentStatus(Number(payRec.payos_order_code));
              const remoteSt = String(remote?.status || '').toUpperCase();
              if (remote && remoteSt === 'PAID' && Number(remote.amountPaid) >= amount) {
                const nowIso = new Date().toISOString();
                await pool.query(
                  `UPDATE commerce_payments
                   SET status = 'SUCCEEDED', paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
                   WHERE id = $1`,
                  [payRec.id],
                );
                await pool.query(
                  `UPDATE commerce_orders
                   SET status = 'PAID',
                       timeline = COALESCE(timeline, '[]'::jsonb) || $2::jsonb,
                       updated_at = NOW()
                   WHERE id = $1 AND UPPER(status) = 'PENDING_PAYMENT'`,
                  [
                    row.id,
                    JSON.stringify([
                      {
                        status: 'PAID',
                        title: 'Đã xác nhận thanh toán PayOS',
                        timestamp: nowIso,
                        note: `Đối soát tự động từ PayOS (orderCode: ${payRec.payos_order_code})`,
                      },
                    ]),
                  ],
                );
                paymentStatus = 'PAID';
                needsNewLink = false;
              } else if (remoteSt === 'CANCELLED' || remoteSt === 'EXPIRED') {
                needsNewLink = true;
              }
            } catch {
              // Ignore remote status lookup failure
            }
          }

          if (needsNewLink && payOs.isConfigured()) {
            try {
              if (payRec?.id && String(payRec.status || '').toUpperCase() === 'PENDING') {
                await pool.query(
                  `UPDATE commerce_payments SET status = 'CANCELLED', updated_at = NOW() WHERE id = $1`,
                  [payRec.id],
                );
              }
              let nextPayosCode = Math.floor(1000000 + Math.random() * 9000000);
              try {
                const seqRes = await pool.query(
                  `SELECT nextval('commerce_payos_order_code_seq') AS v`,
                );
                nextPayosCode = Number(seqRes.rows[0]?.v || nextPayosCode);
              } catch {
                // Fallback random code
              }
              const link = await payOs.createPaymentLink({
                orderId: String(row.id),
                orderCode: nextPayosCode,
                amount: amount,
                description: `Dau gia ${row.order_code}`.slice(0, 25),
                expiresAt: dueDate,
                items: [{ name: productTitle.slice(0, 80), quantity: 1, price: amount }],
              });
              paymentLinkId = link.paymentLinkId || undefined;
              checkoutUrl = link.checkoutUrl || '';
              qrCode = link.qrCode || undefined;
              paymentStatus = 'PENDING';
              await pool.query(
                `INSERT INTO commerce_payments (
                  order_id, payment_method, idempotency_key, amount, currency, status,
                  payos_order_code, payment_link_id, checkout_url, qr_code, expires_at
                ) VALUES ($1, 'PAYOS', $2, $3, 'VND', 'PENDING', $4, $5, $6, $7, $8)`,
                [
                  row.id,
                  `auction-order:${auctionId}:renew:${nextPayosCode}`,
                  amount,
                  nextPayosCode,
                  paymentLinkId || null,
                  checkoutUrl || null,
                  qrCode || null,
                  dueDate.toISOString(),
                ],
              );
            } catch (renewErr) {
              res.status(502).json({
                success: false,
                error: 'PayOS chưa cấp được QR cho đúng số tiền đơn hàng. Vui lòng thử lại.',
              });
              console.warn(
                '[commerce-service] PayOS renew link skipped for existing auction order:',
                (renewErr as Error).message,
              );
              return;
            }
          }
        }

        res.status(200).json({
          success: true,
          reused: true,
          data: {
            orderId: String(row.id),
            orderCode: String(row.order_code),
            orderSource: 'AUCTION',
            auctionId,
            totalAmount: Number(row.total_amount),
            status: paymentStatus === 'PAID' ? 'PAID' : String(row.status),
            payment: {
              paymentLinkId,
              checkoutUrl,
              qrCode,
              status: paymentStatus === 'SUCCEEDED' ? 'PAID' : paymentStatus,
            },
          },
        });
        return;
      }

      // 2. Tạo đơn mới trong transaction với advisory lock theo auctionId
      const client = await pool.connect();
      let createdOrderId = '';
      let createdOrderCode = '';
      let payosOrderCode = 0;
      const expiresAt = dueDate;

      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [
          `auction-order:${auctionId}`,
        ]);

        // Double check inside lock
        const doubleCheck = await client.query(
          `SELECT id, order_code, total_amount, status FROM commerce_orders
           WHERE auction_id = $1 AND buyer_id = $2 AND UPPER(status) <> 'CANCELLED'
           LIMIT 1`,
          [auctionId, user.sub],
        );
        if (doubleCheck.rows.length > 0) {
          const row = doubleCheck.rows[0];
          const payRow = await client.query(
            `SELECT payment_link_id, checkout_url, status, qr_code FROM commerce_payments WHERE order_id = $1 ORDER BY id DESC LIMIT 1`,
            [row.id],
          );
          await client.query('COMMIT');
          res.status(200).json({
            success: true,
            reused: true,
            data: {
              orderId: String(row.id),
              orderCode: String(row.order_code),
              orderSource: 'AUCTION',
              auctionId,
              totalAmount: Number(row.total_amount),
              status: String(row.status),
              payment: {
                paymentLinkId: payRow.rows[0]?.payment_link_id || undefined,
                checkoutUrl: payRow.rows[0]?.checkout_url || '',
                qrCode: payRow.rows[0]?.qr_code || undefined,
                status: String(payRow.rows[0]?.status || 'PENDING'),
              },
            },
          });
          return;
        }

        createdOrderId = crypto.randomUUID();
        createdOrderCode = buildAuctionOrderCode();
        const buyerName = String(shippingAddress.fullName || user.email || 'Người mua Nexus');
        const initialTimeline = [
          {
            status: 'PENDING_PAYMENT',
            timestamp: new Date().toISOString(),
            note: `Tạo đơn thắng đấu giá từ phiên #${auctionId}`,
          },
        ];

        await client.query(
          `INSERT INTO commerce_orders (
            id, order_code, buyer_id, seller_id, buyer_name, buyer_email, seller_name,
            total_amount, shipping_fee, discount_amount, status, shipping_address,
            checkout_session_expires_at, timeline, order_source, auction_id, auction_winning_bid
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,0,'PENDING_PAYMENT',$9::jsonb,$10,$11::jsonb,'AUCTION',$12,$13)`,
          [
            createdOrderId,
            createdOrderCode,
            user.sub,
            sellerId,
            buyerName,
            user.email || '',
            sellerName,
            amount,
            JSON.stringify(shippingAddress),
            expiresAt.toISOString(),
            JSON.stringify(initialTimeline),
            auctionId,
            amount,
          ],
        );

        await client.query(
          `INSERT INTO commerce_order_items (order_id, product_id, product_title, unit_price, quantity, subtotal)
           VALUES ($1, $2, $3, $4, 1, $4)`,
          [createdOrderId, productId, productTitle, amount],
        );

        await client.query(
          `INSERT INTO commerce_stock_reservations (order_id, product_id, quantity, status, expires_at)
           VALUES ($1, $2, 1, 'ACTIVE', $3)`,
          [createdOrderId, productId, expiresAt.toISOString()],
        );

        try {
          const seqRes = await client.query(`SELECT nextval('commerce_payos_order_code_seq') AS v`);
          payosOrderCode = Number(
            seqRes.rows[0]?.v || Math.floor(1000000 + Math.random() * 9000000),
          );
        } catch {
          payosOrderCode = Math.floor(1000000 + Math.random() * 9000000);
        }

        // Tạo link PayOS nếu cấu hình sẵn
        let paymentLinkId: string | null = null;
        let checkoutUrl = '';
        let qrCode: string | null = null;
        try {
          if (payOs.isConfigured()) {
            const link = await payOs.createPaymentLink({
              orderId: createdOrderId,
              orderCode: payosOrderCode,
              amount: amount,
              description: `Dau gia ${createdOrderCode}`.slice(0, 25),
              expiresAt,
              items: [{ name: productTitle.slice(0, 80), quantity: 1, price: amount }],
            });
            paymentLinkId = link.paymentLinkId || null;
            checkoutUrl = link.checkoutUrl || '';
            qrCode = link.qrCode || null;
          }
        } catch (payErr) {
          console.warn(
            '[commerce-service] PayOS createPaymentLink skipped for auction order:',
            (payErr as Error).message,
          );
          throw new Error('PAYOS_LINK_UNAVAILABLE');
        }

        await client.query(
          `INSERT INTO commerce_payments (
            order_id, payment_method, idempotency_key, amount, currency, status,
            payos_order_code, payment_link_id, checkout_url, qr_code, expires_at
          ) VALUES ($1, 'PAYOS', $2, $3, 'VND', 'PENDING', $4, $5, $6, $7, $8)`,
          [
            createdOrderId,
            `auction-order:${auctionId}`,
            amount,
            payosOrderCode,
            paymentLinkId,
            checkoutUrl || null,
            qrCode,
            expiresAt.toISOString(),
          ],
        );

        await client.query('COMMIT');

        res.status(201).json({
          success: true,
          data: {
            orderId: createdOrderId,
            orderCode: createdOrderCode,
            orderSource: 'AUCTION',
            auctionId,
            totalAmount: amount,
            status: 'PENDING_PAYMENT',
            payment: {
              paymentLinkId: paymentLinkId || undefined,
              checkoutUrl,
              qrCode: qrCode || undefined,
              status: 'PENDING',
            },
          },
        });
      } catch (txErr) {
        await client.query('ROLLBACK').catch(() => {});
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      if (err instanceof Error && err.message === 'PAYOS_LINK_UNAVAILABLE') {
        res.status(502).json({
          success: false,
          error: 'PayOS chưa cấp được QR cho đúng số tiền đơn hàng. Vui lòng thử lại.',
        });
        return;
      }
      console.error('[commerce-service] POST /orders/from-auction error:', err);
      res.status(500).json({
        success: false,
        error: 'Không thể tạo đơn hàng thắng đấu giá lúc này. Vui lòng thử lại.',
      });
    }
  });

  // GET /api/v1/orders/internal/auction-status/:orderId — Đồng bộ trạng thái thanh toán về auction-service
  router.get(
    '/orders/internal/auction-status/:orderId',
    requireScopedServiceOnly({
      requiredScope: 'order:auction:status:read',
      allowedIssuers: ['auction-service'],
      resourceResolver: (req) => String(req.params.orderId || '').trim(),
    }),
    async (req: Request, res: Response) => {
      try {
        const idOrCode = String(req.params.orderId || '').trim();
        if (!idOrCode) {
          res.status(400).json({ success: false, error: 'orderId is required' });
          return;
        }
        const q = await pool.query(
          `SELECT o.id, o.order_code, o.status AS order_status, o.auction_id, o.total_amount,
                p.id AS payment_id, p.status AS payment_status, p.payos_order_code, p.checkout_url, p.paid_at
         FROM commerce_orders o
         LEFT JOIN LATERAL (
           SELECT id, status, payos_order_code, checkout_url, paid_at
           FROM commerce_payments
           WHERE order_id = o.id
           ORDER BY id DESC
           LIMIT 1
         ) p ON true
         WHERE o.id = $1 OR o.order_code = $1 OR o.auction_id = $1
         ORDER BY o.created_at DESC
         LIMIT 1`,
          [idOrCode],
        );
        if (q.rows.length === 0) {
          res
            .status(404)
            .json({ success: false, code: 'AUCTION_ORDER_NOT_FOUND', error: 'Order not found' });
          return;
        }
        const r = q.rows[0];
        let ordStatus = String(r.order_status || '').toUpperCase();
        let payStatus = String(r.payment_status || '').toUpperCase();
        let paidAtIso: string | null = r.paid_at ? new Date(r.paid_at).toISOString() : null;

        // Chủ động đối soát với cổng PayOS nếu đơn đang chờ thanh toán để đồng bộ tức thì sang Auction Service
        if (
          payStatus === 'PENDING' &&
          ordStatus === 'PENDING_PAYMENT' &&
          r.payos_order_code &&
          payOs.isConfigured()
        ) {
          try {
            const remote = await payOs.getPaymentStatus(Number(r.payos_order_code));
            const remoteSt = String(remote?.status || '').toUpperCase();
            if (
              remote &&
              remoteSt === 'PAID' &&
              Number(remote.amountPaid) >= Number(r.total_amount)
            ) {
              const nowIso = new Date().toISOString();
              await pool.query(
                `UPDATE commerce_payments
               SET status = 'SUCCEEDED', paid_at = COALESCE(paid_at, NOW()), updated_at = NOW()
               WHERE id = $1`,
                [r.payment_id],
              );
              await pool.query(
                `UPDATE commerce_orders
               SET status = 'PAID',
                   timeline = COALESCE(timeline, '[]'::jsonb) || $2::jsonb,
                   updated_at = NOW()
               WHERE id = $1 AND UPPER(status) = 'PENDING_PAYMENT'`,
                [
                  r.id,
                  JSON.stringify([
                    {
                      status: 'PAID',
                      title: 'Đã xác nhận thanh toán PayOS',
                      timestamp: nowIso,
                      note: `Đồng bộ trạng thái PAID từ PayOS (orderCode: ${r.payos_order_code})`,
                    },
                  ]),
                ],
              );
              await pool.query(
                `UPDATE commerce_stock_reservations
               SET status = 'COMMITTED'
               WHERE order_id = $1 AND status = 'ACTIVE'`,
                [r.id],
              );
              ordStatus = 'PAID';
              payStatus = 'SUCCEEDED';
              paidAtIso = nowIso;
            } else if (remoteSt === 'CANCELLED' || remoteSt === 'EXPIRED') {
              r.checkout_url = null;
            }
          } catch {
            // Non-blocking remote verification
          }
        }

        // Nếu đơn chưa bị hủy nhưng đã quá hạn checkout_session_expires_at và chưa thanh toán -> tự hủy đơn & giải phóng kho ngay khi đối soát
        if (ordStatus === 'PENDING_PAYMENT' && payStatus !== 'PAID' && payStatus !== 'SUCCEEDED') {
          const expCheck = await pool.query(
            `SELECT checkout_session_expires_at, timeline
           FROM commerce_orders
           WHERE id = $1
           LIMIT 1`,
            [r.id],
          );
          const expRow = expCheck.rows[0];
          const expDate = expRow?.checkout_session_expires_at
            ? new Date(expRow.checkout_session_expires_at)
            : null;
          if (expDate && !Number.isNaN(expDate.getTime()) && expDate.getTime() <= Date.now()) {
            await expiryWorker.runCleanup(String(r.id));
            const refreshed = await pool.query('SELECT status FROM commerce_orders WHERE id = $1', [
              r.id,
            ]);
            ordStatus = String(refreshed.rows[0]?.status || ordStatus).toUpperCase();
          }
        }

        const isPaid =
          payStatus === 'PAID' ||
          payStatus === 'SUCCEEDED' ||
          ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'COMPLETED'].includes(ordStatus);

        res.status(200).json({
          success: true,
          data: {
            orderId: String(r.id),
            orderCode: String(r.order_code),
            auctionId: r.auction_id ? String(r.auction_id) : null,
            orderStatus: ordStatus,
            paymentStatus: isPaid ? 'PAID' : ordStatus === 'CANCELLED' ? 'TIMEOUT' : 'PENDING',
            checkoutUrl: r.checkout_url || null,
            paidAt: paidAtIso,
          },
        });
      } catch (err) {
        console.error('[commerce-service] internal auction-status error:', err);
        res.status(500).json({ success: false, error: 'Internal error' });
      }
    },
  );

  return router;
}
