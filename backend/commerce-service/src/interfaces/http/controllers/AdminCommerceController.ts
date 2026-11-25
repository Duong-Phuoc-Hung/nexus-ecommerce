import { Request, Response } from 'express';
import { AdminDashboardReportService } from '../../../application/admin/AdminDashboardReportService';
import { AdminPromotionService } from '../../../application/admin/AdminPromotionService';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';

export class AdminCommerceController {
  constructor(
    private readonly reportService: AdminDashboardReportService,
    private readonly promotionService: AdminPromotionService,
  ) {}

  public async getDashboardSummary(_req: Request, res: Response): Promise<void> {
    try {
      const data = await this.reportService.getDashboardSummary();
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Không thể tổng hợp dữ liệu Dashboard.',
      });
    }
  }

  public async getReports(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const data = await this.reportService.getReports({
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        granularity: granularity ? String(granularity) : undefined,
      });
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Không thể tải báo cáo số liệu.',
      });
    }
  }

  public async exportReports(req: Request, res: Response): Promise<void> {
    try {
      const { from, to, granularity } = req.query;
      const { filename, csv } = await this.reportService.exportReportsCsv({
        from: from ? String(from) : undefined,
        to: to ? String(to) : undefined,
        granularity: granularity ? String(granularity) : undefined,
      });

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Không thể xuất tệp báo cáo CSV.',
      });
    }
  }

  public async listPromotions(req: Request, res: Response): Promise<void> {
    try {
      const { q, status, page, limit } = req.query;
      const result = await this.promotionService.listPromotions({
        q: q ? String(q) : undefined,
        status: status ? String(status) : undefined,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      });
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err: any) {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Không thể tải danh sách khuyến mãi.',
      });
    }
  }

  public async createPromotion(req: Request, res: Response): Promise<void> {
    try {
      const adminUser = (req as AuthenticatedRequest).user;
      const created = await this.promotionService.createPromotion(
        req.body,
        adminUser?.sub || 'admin',
      );
      res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Không thể tạo mới mã khuyến mãi.',
      });
    }
  }

  public async updatePromotion(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const adminUser = (req as AuthenticatedRequest).user;
      const updated = await this.promotionService.updatePromotion(
        id,
        req.body,
        adminUser?.sub || 'admin',
      );
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Không thể cập nhật mã khuyến mãi.',
      });
    }
  }

  public async updatePromotionStatus(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { status, reason } = req.body;
      const adminUser = (req as AuthenticatedRequest).user;
      const updated = await this.promotionService.updatePromotionStatus(
        id,
        status,
        reason,
        adminUser?.sub || 'admin',
      );
      res.status(200).json({
        success: true,
        data: updated,
      });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Không thể cập nhật trạng thái khuyến mãi.',
      });
    }
  }

  public async deletePromotion(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await this.promotionService.deletePromotion(id);
      res.status(200).json({
        success: true,
        message: 'Đã xóa mã khuyến mãi thành công.',
      });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Không thể xóa mã khuyến mãi.',
      });
    }
  }

  public async getPromotionUsages(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { page, limit } = req.query;
      const result = await this.promotionService.getPromotionUsages(
        id,
        page ? Number(page) : 1,
        limit ? Number(limit) : 20,
      );
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (err: any) {
      res.status(err.status || 400).json({
        success: false,
        error: err.message || 'Không thể tra cứu lịch sử dùng mã khuyến mãi.',
      });
    }
  }
}
