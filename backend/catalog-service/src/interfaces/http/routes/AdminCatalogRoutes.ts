import { NextFunction, Request, Response, Router } from 'express';
import { PrismaClientWrapper } from '../../../infrastructure/database/PrismaClient';
import { AuthenticatedRequest, requireAuth } from '../../../infrastructure/security/auth';

function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  if (!user || user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      error: 'Chỉ quản trị viên (ADMIN) mới có quyền thực hiện thao tác này.',
    });
    return;
  }
  next();
}

function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

export function createAdminCatalogRoutes(): Router {
  const router = Router();
  const guard = [requireAuth, requireAdmin];

  router.post('/categories', ...guard, async (req: Request, res: Response) => {
    try {
      const b = req.body || {};
      const name = String(b.name || '').trim();
      if (!name) {
        res.status(400).json({ success: false, error: 'Tên danh mục là bắt buộc.' });
        return;
      }

      const prisma = PrismaClientWrapper.getInstance();
      let parentId: bigint | null = null;
      let level = 1;
      if (b.parentId !== undefined && b.parentId !== null && String(b.parentId).trim() !== '') {
        parentId = BigInt(String(b.parentId).trim());
        const parent = await prisma.category.findUnique({ where: { id: parentId } });
        if (!parent) {
          res.status(404).json({ success: false, error: 'Không tìm thấy danh mục cha.' });
          return;
        }
        if (parent.level >= 3) {
          res.status(400).json({
            success: false,
            error: 'Danh mục chỉ hỗ trợ tối đa 3 cấp theo đặc tả SRS.',
          });
          return;
        }
        level = parent.level + 1;
      }

      const baseSlug = slugify(String(b.slug || name)) || `cat-${Date.now()}`;
      let slug = baseSlug;
      const dup = await prisma.category.findUnique({ where: { slug } });
      if (dup) slug = `${baseSlug}-${Date.now().toString(36)}`;

      const created = await prisma.category.create({
        data: {
          name,
          slug,
          description: b.description ? String(b.description).trim() : null,
          imageUrl: b.imageUrl ? String(b.imageUrl).trim() : null,
          parentId,
          level,
          isActive: b.isActive !== false,
          displayOrder: Number(b.displayOrder || 0) || 0,
        },
      });

      res.status(201).json({
        success: true,
        data: {
          id: String(created.id),
          name: created.name,
          slug: created.slug,
          description: created.description,
          imageUrl: created.imageUrl,
          parentId: created.parentId ? String(created.parentId) : null,
          level: created.level,
          isActive: created.isActive,
          displayOrder: created.displayOrder,
        },
      });
    } catch (err) {
      console.error('[catalog-service] create category error:', err);
      res.status(500).json({ success: false, error: 'Không thể tạo danh mục mới.' });
    }
  });

  // PUT /api/v1/categories/:id
  router.put('/categories/:id', ...guard, async (req: Request, res: Response) => {
    try {
      const idStr = String(req.params.id || '').trim();
      if (!/^\d+$/.test(idStr)) {
        res.status(400).json({ success: false, error: 'Mã danh mục không hợp lệ.' });
        return;
      }
      const id = BigInt(idStr);
      const prisma = PrismaClientWrapper.getInstance();
      const existing = await prisma.category.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ success: false, error: 'Không tìm thấy danh mục.' });
        return;
      }

      const b = req.body || {};
      let parentId = existing.parentId;
      let level = existing.level;
      if (b.parentId !== undefined) {
        if (b.parentId === null || String(b.parentId).trim() === '') {
          parentId = null;
          level = 1;
        } else {
          const nextParentId = BigInt(String(b.parentId).trim());
          if (nextParentId === id) {
            res
              .status(400)
              .json({ success: false, error: 'Danh mục không thể tự làm cha của chính nó.' });
            return;
          }
          const parent = await prisma.category.findUnique({ where: { id: nextParentId } });
          if (!parent) {
            res.status(404).json({ success: false, error: 'Không tìm thấy danh mục cha.' });
            return;
          }
          if (parent.level >= 3) {
            res
              .status(400)
              .json({ success: false, error: 'Danh mục chỉ hỗ trợ tối đa 3 cấp theo SRS.' });
            return;
          }
          parentId = nextParentId;
          level = parent.level + 1;
        }
      }

      const updated = await prisma.category.update({
        where: { id },
        data: {
          name: b.name !== undefined ? String(b.name).trim() || existing.name : existing.name,
          description:
            b.description !== undefined
              ? String(b.description).trim() || null
              : existing.description,
          imageUrl:
            b.imageUrl !== undefined ? String(b.imageUrl).trim() || null : existing.imageUrl,
          parentId,
          level,
          isActive: b.isActive !== undefined ? Boolean(b.isActive) : existing.isActive,
          displayOrder:
            b.displayOrder !== undefined ? Number(b.displayOrder) || 0 : existing.displayOrder,
        },
      });

      res.status(200).json({
        success: true,
        data: {
          id: String(updated.id),
          name: updated.name,
          slug: updated.slug,
          description: updated.description,
          imageUrl: updated.imageUrl,
          parentId: updated.parentId ? String(updated.parentId) : null,
          level: updated.level,
          isActive: updated.isActive,
          displayOrder: updated.displayOrder,
        },
      });
    } catch (err) {
      console.error('[catalog-service] update category error:', err);
      res.status(500).json({ success: false, error: 'Không thể cập nhật danh mục.' });
    }
  });

  // DELETE /api/v1/categories/:id
  router.delete('/categories/:id', ...guard, async (req: Request, res: Response) => {
    try {
      const idStr = String(req.params.id || '').trim();
      if (!/^\d+$/.test(idStr)) {
        res.status(400).json({ success: false, error: 'Mã danh mục không hợp lệ.' });
        return;
      }
      const id = BigInt(idStr);
      const prisma = PrismaClientWrapper.getInstance();
      const productCount = await prisma.product.count({
        where: { categoryId: id, deletedAt: null },
      });
      if (productCount > 0) {
        await prisma.category.update({ where: { id }, data: { isActive: false } });
        res.status(200).json({
          success: true,
          data: { id: idStr, deactivated: true },
          message: 'Danh mục đang chứa sản phẩm nên đã được chuyển sang trạng thái Tạm ẩn.',
        });
        return;
      }

      await prisma.category.delete({ where: { id } });
      res.status(200).json({ success: true, data: { id: idStr, deleted: true } });
    } catch (err: any) {
      if (err?.code === 'P2025') {
        res.status(404).json({ success: false, error: 'Không tìm thấy danh mục.' });
        return;
      }
      console.error('[catalog-service] delete category error:', err);
      res.status(500).json({ success: false, error: 'Không thể xóa danh mục.' });
    }
  });

  return router;
}
