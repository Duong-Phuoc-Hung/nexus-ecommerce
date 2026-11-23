import {
  CaseStatus,
  CaseType,
  ModerationDecision,
  ModerationError,
  ModerationRepository,
  QueueFilters,
} from '../../application/use-cases/ModerationService';
import { randomUUID } from 'node:crypto';
import { PrismaClientWrapper } from '../database/PrismaClient';
import { Prisma, PrismaClient } from '../database/generated/client';

interface CaseRecord {
  id: string;
  product_id: string;
  review_id: string | null;
  kind: CaseType;
  status: CaseStatus;
}

function missing(): never {
  throw new ModerationError(404, 'MODERATION_NOT_FOUND', 'Không tìm thấy nội dung kiểm duyệt.');
}

function conflict(message: string): never {
  throw new ModerationError(409, 'MODERATION_CONFLICT', message);
}

const caseFields = Prisma.sql`c.id, c.product_id AS "productId", c.review_id AS "reviewId",
  c.kind AS type, c.status, c.report_reason AS "reportReason", c.created_at AS "createdAt",
  c.updated_at AS "updatedAt", p.title, p.seller_id AS "sellerId", p.seller_name AS "sellerName",
  p.status AS "productStatus", (SELECT image_url FROM catalog_product_images
    WHERE product_id=p.id ORDER BY is_primary DESC, display_order, id LIMIT 1) AS "thumbnailUrl"`;

export class PostgresModerationRepository implements ModerationRepository {
  constructor(private readonly client?: PrismaClient) {}

  private get db() {
    return this.client ?? PrismaClientWrapper.getInstance();
  }

  async list({ status, type, q, limit, page }: QueueFilters) {
    const [row] = await this.db.$queryRaw<Array<{ items: unknown[]; total: number }>>`
      WITH filtered AS (
        SELECT ${caseFields} FROM catalog_moderation_cases c
        JOIN catalog_products p ON p.id=c.product_id
        WHERE p.deleted_at IS NULL
          AND (${status ?? null}::text IS NULL OR c.status=${status ?? null})
          AND (${type ?? null}::text IS NULL OR c.kind=${type ?? null})
          AND (${q}='' OR strpos(lower(p.title), lower(${q}))>0
            OR strpos(lower(p.id), lower(${q}))>0 OR strpos(lower(COALESCE(p.seller_name,'')), lower(${q}))>0)
      ), page AS (
        SELECT * FROM filtered ORDER BY "createdAt" DESC, id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}
      )
      SELECT COALESCE((SELECT jsonb_agg(page ORDER BY "createdAt" DESC, id DESC) FROM page), '[]') AS items,
             (SELECT count(*)::int FROM filtered) AS total
    `;
    return row;
  }

  async detail(caseId: string) {
    const [row] = await this.db.$queryRaw<unknown[]>`
      SELECT ${caseFields}, p.description, p.base_price::float8 AS price,
        cat.id::text AS "categoryId", cat.name AS "categoryName", c.reporter_id AS "reporterId",
        COALESCE((SELECT jsonb_agg(image_url ORDER BY display_order, id)
          FROM catalog_product_images WHERE product_id=p.id), '[]') AS images,
        (SELECT jsonb_build_object('id', r.id, 'rating', r.rating, 'comment', r.comment,
          'userName', r.user_name, 'createdAt', r.created_at, 'hidden', r.moderated_hidden)
          FROM catalog_product_reviews r WHERE r.id=c.review_id) AS review,
        COALESCE((SELECT jsonb_agg(jsonb_build_object('caseId', h.case_id, 'actorId', h.actor_id,
          'decision', h.decision, 'reason', h.reason, 'violationCategory', h.violation_category,
          'createdAt', h.created_at) ORDER BY h.id DESC)
          FROM catalog_moderation_actions h JOIN catalog_moderation_cases prior ON prior.id=h.case_id
          WHERE prior.product_id=c.product_id AND prior.review_id IS NOT DISTINCT FROM c.review_id), '[]') AS history
      FROM catalog_moderation_cases c JOIN catalog_products p ON p.id=c.product_id
      JOIN catalog_categories cat ON cat.id=p.category_id WHERE c.id=${caseId}
    `;
    return row ?? missing();
  }

  async report({
    actorId,
    productId,
    reviewId,
    reason,
  }: {
    actorId: string;
    productId: string;
    reviewId?: string;
    reason: string;
  }) {
    return this.db.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, productId);
      if (product.status !== 'ACTIVE') return missing();
      if (reviewId) {
        const [review] = await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM catalog_product_reviews WHERE id=${reviewId}
            AND product_id=${productId} AND NOT moderated_hidden
        `;
        if (!review) return missing();
      }
      const type = reviewId ? 'REPORTED_REVIEW' : 'REPORTED_PRODUCT';
      const [created] = await tx.$queryRaw<{ id: string }[]>`
        INSERT INTO catalog_moderation_cases (id, product_id, review_id, kind, reporter_id, report_reason)
        VALUES (${randomUUID()},${productId},${reviewId ?? null},${type},${actorId},${reason})
        ON CONFLICT DO NOTHING RETURNING id
      `;
      if (!created) conflict('Đối tượng đã có hồ sơ chờ xử lý.');
      return { id: created.id, productId, reviewId: reviewId ?? null, type, status: 'PENDING' };
    });
  }

  async sellerStatus(productId: string, sellerId: string) {
    const [row] = await this.db.$queryRaw<unknown[]>`
      SELECT c.id, c.status, c.updated_at AS "updatedAt",
        (SELECT jsonb_build_object('decision', a.decision, 'reason', a.reason,
            'violationCategory', a.violation_category, 'createdAt', a.created_at)
          FROM catalog_moderation_actions a
          WHERE a.case_id=c.id AND a.decision <> 'RESUBMIT' ORDER BY a.id DESC LIMIT 1) AS "lastDecision"
      FROM catalog_moderation_cases c JOIN catalog_products p ON p.id=c.product_id
      WHERE c.product_id=${productId} AND p.seller_id=${sellerId} AND p.deleted_at IS NULL AND c.review_id IS NULL
      ORDER BY c.updated_at DESC, c.id DESC LIMIT 1
    `;
    return row ?? missing();
  }

  async resubmit(productId: string, sellerId: string) {
    return this.db.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, productId);
      if (product.seller_id !== sellerId) {
        throw new ModerationError(403, 'FORBIDDEN', 'Bạn không sở hữu sản phẩm này.');
      }
      const [current] = await tx.$queryRaw<CaseRecord[]>`
        SELECT * FROM catalog_moderation_cases WHERE product_id=${productId} AND review_id IS NULL
        ORDER BY updated_at DESC, id DESC LIMIT 1
      `;
      if (!current || !product.moderation_blocked)
        return conflict('Sản phẩm không cần gửi duyệt lại.');
      if (current.status === 'PENDING') return { id: current.id, productId, status: 'PENDING' };
      if (current.status !== 'CHANGES_REQUESTED')
        return conflict('Chỉ hồ sơ yêu cầu chỉnh sửa được gửi duyệt lại.');
      await tx.$executeRaw`
        UPDATE catalog_moderation_cases SET status='PENDING', updated_at=now() WHERE id=${current.id}
      `;
      await tx.$executeRaw`
        INSERT INTO catalog_moderation_actions (case_id, actor_id, decision)
        VALUES (${current.id},${sellerId},'RESUBMIT')
      `;
      return { id: current.id, productId, status: 'PENDING' };
    });
  }

  async decide(input: ModerationDecision) {
    const { actorId, productId, caseId, decision, reason, violationCategory } = input;
    return this.db.$transaction(async (tx) => {
      const product = await this.lockProduct(tx, productId);
      const [current] = await tx.$queryRaw<CaseRecord[]>`
        SELECT * FROM catalog_moderation_cases
        WHERE product_id=${productId} AND (
          (${caseId ?? null}::text IS NOT NULL AND id=${caseId ?? null})
          OR (${caseId ?? null}::text IS NULL AND review_id IS NULL)
        )
        ORDER BY (status='PENDING') DESC, updated_at DESC, id DESC LIMIT 1
      `;
      if (!current) return missing();
      if (
        current.status !== 'PENDING' &&
        !(current.review_id && current.status === 'CHANGES_REQUESTED')
      ) {
        return conflict('Hồ sơ đã được xử lý.');
      }

      const approved = decision === 'APPROVE';
      const status = approved
        ? 'APPROVED'
        : decision === 'REJECT'
          ? 'REJECTED'
          : 'CHANGES_REQUESTED';
      if (current.review_id) {
        await tx.$executeRaw`
          UPDATE catalog_product_reviews SET moderated_hidden=${!approved}, updated_at=now()
          WHERE id=${current.review_id} AND product_id=${productId}
        `;
      } else if (!approved || product.moderation_blocked) {
        const productStatus = approved ? 'ACTIVE' : decision === 'REJECT' ? 'INACTIVE' : 'DRAFT';
        await tx.$executeRaw`
          UPDATE catalog_products SET status=${productStatus}, moderation_blocked=${!approved}, updated_at=now()
          WHERE id=${productId}
        `;
      }
      await tx.$executeRaw`
        UPDATE catalog_moderation_cases SET status=${status}, updated_at=now() WHERE id=${current.id}
      `;
      await tx.$executeRaw`
        INSERT INTO catalog_moderation_actions (case_id, actor_id, decision, reason, violation_category)
        VALUES (${current.id},${actorId},${decision},${reason},${violationCategory})
      `;
      return { id: current.id, productId, reviewId: current.review_id, type: current.kind, status };
    });
  }

  private async lockProduct(tx: Prisma.TransactionClient, productId: string) {
    const [product] = await tx.$queryRaw<
      { seller_id: string; status: string; moderation_blocked: boolean }[]
    >`
      SELECT seller_id, status, moderation_blocked FROM catalog_products
      WHERE id=${productId} AND deleted_at IS NULL FOR UPDATE
    `;
    return product ?? missing();
  }
}
