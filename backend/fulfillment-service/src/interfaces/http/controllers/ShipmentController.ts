import { Request, Response } from 'express';
import { GetShipmentDetailUseCase } from '../../../application/use-cases/GetShipmentDetailUseCase';
import { SearchShipmentsUseCase } from '../../../application/use-cases/SearchShipmentsUseCase';
import { UpdateShipmentStatusUseCase } from '../../../application/use-cases/UpdateShipmentStatusUseCase';
import { ManualOverrideShipmentUseCase } from '../../../application/use-cases/ManualOverrideShipmentUseCase';
import { GetFulfillmentSummaryUseCase } from '../../../application/use-cases/GetFulfillmentSummaryUseCase';
import { ProcessCarrierWebhookUseCase } from '../../../application/use-cases/ProcessCarrierWebhookUseCase';
import { CreateShipmentUseCase } from '../../../application/use-cases/CreateShipmentUseCase';
import { RequestRedeliveryUseCase } from '../../../application/use-cases/RequestRedeliveryUseCase';
import { ConfirmReturnUseCase } from '../../../application/use-cases/ConfirmReturnUseCase';
import { ShipmentNotFoundException } from '../../../domain/exceptions/ShipmentNotFoundException';
import { AuthenticatedRequest } from '../../../infrastructure/security/auth';
import { PrismaClientWrapper } from '../../../infrastructure/database/PrismaClient';

export class ShipmentController {
  constructor(
    private readonly getShipmentDetailUseCase: GetShipmentDetailUseCase,
    private readonly searchShipmentsUseCase: SearchShipmentsUseCase,
    private readonly updateShipmentStatusUseCase: UpdateShipmentStatusUseCase,
    private readonly manualOverrideShipmentUseCase: ManualOverrideShipmentUseCase,
    private readonly getFulfillmentSummaryUseCase: GetFulfillmentSummaryUseCase,
    private readonly processCarrierWebhookUseCase?: ProcessCarrierWebhookUseCase,
    private readonly createShipmentUseCase?: CreateShipmentUseCase,
    private readonly requestRedeliveryUseCase?: RequestRedeliveryUseCase,
    private readonly confirmReturnUseCase?: ConfirmReturnUseCase,
  ) {}

  public async listShipments(req: Request, res: Response): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
      const query = (req.query.query || req.query.q) as string | undefined;
      const carrier = req.query.carrier as string | undefined;
      const status = req.query.status as string | undefined;
      const orderId = req.query.orderId as string | undefined;
      const trackingCode = req.query.trackingCode as string | undefined;

      const result = await this.searchShipmentsUseCase.execute({
        query,
        carrier,
        status,
        orderId,
        trackingCode,
        page,
        limit,
      });

      // Tự động cấp phát / hiển thị vận đơn Sandbox nếu tra cứu theo mã đơn hàng mà chưa từng lưu trong phân hệ
      if (
        result.total === 0 &&
        this.createShipmentUseCase &&
        ((query && (query.trim().toUpperCase().startsWith('ORD') || query.trim().length >= 8)) ||
          (orderId && orderId.trim().toUpperCase().startsWith('ORD')))
      ) {
        const lookupOrderCode = (orderId || query)!.replace(/^[#]/, '').trim();
        try {
          const autoShipment = await this.createShipmentUseCase.execute({
            orderId: lookupOrderCode,
            carrier: carrier || 'GHN',
            shippingAddress: 'Địa chỉ nhận hàng (Theo đơn ' + lookupOrderCode + ')',
            status: 'READY_TO_PICK',
          });
          if (autoShipment) {
            res.status(200).json({
              success: true,
              data: [autoShipment],
              pagination: {
                total: 1,
                page: 1,
                limit,
                totalPages: 1,
              },
            });
            return;
          }
        } catch (autoErr) {
          console.warn('[ShipmentController.listShipments] Auto-provision warning:', autoErr);
        }
      }

      res.status(200).json({
        success: true,
        data: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      });
    } catch (error) {
      console.error('[ShipmentController.listShipments Error]:', error);
      res.status(500).json({
        success: false,
        error: 'Không thể tra cứu danh sách vận đơn.',
      });
    }
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const shipmentId = (req.params.id || 'shp_01hqz222trk') as string;
      const shipment = await this.getShipmentDetailUseCase.execute(shipmentId);
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (error) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Lỗi máy chủ khi lấy chi tiết vận đơn.',
      });
    }
  }

  public async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const shipmentId = req.params.id as string;
      const { status, location, note } = req.body;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Thiếu thông tin trường "status" cập nhật vận đơn.',
        });
        return;
      }

      const updated = await this.updateShipmentStatusUseCase.execute({
        shipmentId,
        status,
        location,
        note,
      });

      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái vận đơn thành công.',
        data: updated,
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể cập nhật trạng thái vận đơn.',
      });
    }
  }

  public async manualOverride(req: Request, res: Response): Promise<void> {
    try {
      const shipmentId = req.params.id as string;
      const { carrier, trackingCode, shippingAddress, city, status, reason } = req.body;
      const user = (req as AuthenticatedRequest).user;

      const overridden = await this.manualOverrideShipmentUseCase.execute({
        shipmentId,
        carrier,
        trackingCode,
        shippingAddress,
        city,
        status,
        reason,
        operatorId: user?.sub,
      });

      res.status(200).json({
        success: true,
        message: 'Điều chỉnh thông tin vận đơn thủ công thành công.',
        data: overridden,
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể điều chỉnh thủ công vận đơn.',
      });
    }
  }

  /**
   * POST /api/v1/fulfillment/shipments
   * Khởi tạo hoặc đăng ký vận đơn sandbox cho đơn hàng
   */
  public async createShipment(req: Request, res: Response): Promise<void> {
    try {
      if (!this.createShipmentUseCase) {
        res.status(500).json({
          success: false,
          error: 'CreateShipmentUseCase not configured.',
        });
        return;
      }

      const {
        orderId,
        carrier,
        trackingCode,
        shippingAddress,
        recipientName,
        recipientPhone,
        city,
        currentLocation,
        status,
      } = req.body || {};

      if (!orderId) {
        res.status(400).json({
          success: false,
          error: 'Trường "orderId" là bắt buộc khi khởi tạo vận đơn.',
        });
        return;
      }

      const shipment = await this.createShipmentUseCase.execute({
        orderId,
        carrier,
        trackingCode,
        shippingAddress,
        recipientName,
        recipientPhone,
        city,
        currentLocation,
        status,
      });

      res.status(201).json({
        success: true,
        message: 'Khởi tạo vận đơn sandbox thành công.',
        data: shipment,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể khởi tạo vận đơn.',
      });
    }
  }

  public async getByOrderId(req: Request, res: Response): Promise<void> {
    try {
      const orderId = String(req.params.orderId || '')
        .replace(/^[#]/, '')
        .replace(/^NEX-TRK-/i, '')
        .trim();
      let shipment: any;
      try {
        shipment = await this.getShipmentDetailUseCase.execute(orderId);
      } catch (err) {
        if (err instanceof ShipmentNotFoundException && this.createShipmentUseCase) {
          // Tự động cấp phát vận đơn Sandbox cho đơn hàng trong hệ thống nếu chưa từng tạo
          shipment = await this.createShipmentUseCase.execute({
            orderId,
            carrier: 'GHN',
            shippingAddress: 'Địa chỉ giao hàng mặc định (Sandbox)',
            status: 'READY_TO_PICK',
          });
        } else {
          throw err;
        }
      }
      res.status(200).json({
        success: true,
        data: shipment,
      });
    } catch (error) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy vận đơn cho đơn hàng "${req.params.orderId}".`,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Lỗi máy chủ khi tra cứu vận đơn theo mã đơn hàng.',
      });
    }
  }

  /**
   * POST /api/v1/fulfillment/carriers/webhook
   * Webhook tiếp nhận biến động lộ trình từ 3PL (GHN/GHTK) hoặc Simulator
   */
  public async carrierWebhook(req: Request, res: Response): Promise<void> {
    try {
      if (!this.processCarrierWebhookUseCase) {
        res.status(500).json({
          success: false,
          error: 'ProcessCarrierWebhookUseCase not configured.',
        });
        return;
      }

      const carrier = (req.body.carrier || 'GHN') as string;
      const trackingCode = (req.body.tracking_code || req.body.trackingCode || '') as string;
      const orderId = (req.body.order_id || req.body.orderId || '') as string;
      const status = (req.body.status || '') as string;
      const currentLocation = (req.body.current_location ||
        req.body.location ||
        req.body.currentLocation) as string | undefined;
      const shipperName = (req.body.shipper_name || req.body.shipperName) as string | undefined;
      const shipperPhone = (req.body.shipper_phone || req.body.shipperPhone) as string | undefined;
      const timestamp = (req.body.timestamp || new Date().toISOString()) as string;

      if (!status) {
        res.status(400).json({
          success: false,
          error: 'Trường "status" là bắt buộc trong payload Webhook 3PL.',
        });
        return;
      }

      const updated = await this.processCarrierWebhookUseCase.execute({
        carrier,
        trackingCode,
        orderId,
        status,
        currentLocation,
        shipperName,
        shipperPhone,
        timestamp,
      });

      res.status(200).json({
        success: true,
        message: 'Webhook cập nhật trạng thái vận đơn thành công.',
        data: {
          shipmentId: updated.id,
          orderId: updated.orderId,
          trackingCode: updated.trackingCode,
          status: updated.status,
          currentLocation: updated.currentLocation,
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: `Không tìm thấy vận đơn tương ứng với mã vận chuyển/đơn hàng.`,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể xử lý Webhook vận chuyển.',
      });
    }
  }

  public async getDashboardSummary(_req: Request, res: Response): Promise<void> {
    try {
      const summary = await this.getFulfillmentSummaryUseCase.execute();
      res.status(200).json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('[ShipmentController.getDashboardSummary Error]:', error);
      res.status(500).json({
        success: false,
        error: 'Không thể tổng hợp báo cáo tổng quan ca trực.',
      });
    }
  }

  /**
   * POST /api/v1/support/shipments/:id/request-redelivery
   * Yêu cầu đơn vị vận chuyển phát lại đơn giao không thành công (Failed Delivery & RTO)
   */
  public async requestRedelivery(req: Request, res: Response): Promise<void> {
    try {
      if (!this.requestRedeliveryUseCase) {
        res.status(500).json({
          success: false,
          error: 'RequestRedeliveryUseCase not configured.',
        });
        return;
      }

      const shipmentId = req.params.id as string;
      const { carrierCode, rescheduledDate, note } = req.body || {};

      const result = await this.requestRedeliveryUseCase.execute({
        shipmentId,
        carrierCode,
        rescheduledDate,
        note,
      });

      res.status(200).json({
        success: true,
        message: 'Yêu cầu phát lại đơn hàng đã được gửi tới đơn vị vận chuyển.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể yêu cầu phát lại đơn hàng.',
      });
    }
  }

  /**
   * POST /api/v1/support/shipments/:id/confirm-return
   * Xác nhận đơn giao thất bại đã hoàn về kho Seller thành công để đóng hồ sơ vận đơn
   */
  public async confirmReturn(req: Request, res: Response): Promise<void> {
    try {
      if (!this.confirmReturnUseCase) {
        res.status(500).json({
          success: false,
          error: 'ConfirmReturnUseCase not configured.',
        });
        return;
      }

      const shipmentId = req.params.id as string;
      const { returnedToSellerAt, condition, sku, quantity, warehouseId } = req.body || {};

      const result = await this.confirmReturnUseCase.execute({
        shipmentId,
        returnedToSellerAt,
        condition: condition || 'INTACT',
        sku,
        quantity: typeof quantity === 'number' ? quantity : undefined,
        warehouseId,
      });

      res.status(200).json({
        success: true,
        message: 'Đã xác nhận đơn hàng chuyển hoàn về kho người bán thành công.',
        data: result,
      });
    } catch (error: any) {
      if (error instanceof ShipmentNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(400).json({
        success: false,
        error: error.message || 'Không thể xác nhận hoàn trả đơn hàng.',
      });
    }
  }

  /**
   * POST /api/v1/fulfillments/shipments/quote
   * Báo giá cước vận chuyển và thời gian dự kiến (ETA) của các hãng (GHN, GHTK, Viettel Post, J&T)
   */
  public async getShippingQuote(req: Request, res: Response): Promise<void> {
    try {
      const { warehouseId, city } = req.body || {};
      const targetCity = String(city || '')
        .toLowerCase()
        .trim();

      // 1. Truy vấn thông tin Kho bãi xuất phát từ cơ sở dữ liệu (fulfillment_warehouses) qua Prisma ORM
      let warehouseCity = 'Hồ Chí Minh';
      let warehouseName = 'Kho Tổng TP.HCM';
      let warehouseCode = 'WH_001';

      if (process.env.USE_IN_MEMORY_DB !== 'true') {
        try {
          const prisma = PrismaClientWrapper.getInstance();
          let warehouseRecord = null;
          if (warehouseId) {
            warehouseRecord = await prisma.warehouse.findFirst({
              where: {
                OR: [
                  { code: String(warehouseId) },
                  ...(Number.isInteger(Number(warehouseId)) ? [{ id: BigInt(warehouseId) }] : []),
                ],
              },
            });
          }
          if (!warehouseRecord) {
            warehouseRecord = await prisma.warehouse.findFirst({
              where: { isActive: true },
              orderBy: { id: 'asc' },
            });
          }
          if (warehouseRecord) {
            warehouseCity = warehouseRecord.city;
            warehouseName = warehouseRecord.name;
            warehouseCode = warehouseRecord.code;
          }
        } catch {
          // Fallback an toàn nếu DB tạm thời không phản hồi
        }
      } else if (warehouseId === 'WH_002' || warehouseId === '2') {
        warehouseCity = 'Hà Nội';
        warehouseName = 'Kho Phân Phối Hà Nội';
        warehouseCode = 'WH_002';
      }

      // 2. Tính toán khoảng cách / nội thành dựa trên thành phố kho xuất phát từ DB và điểm giao
      const normOrigin = warehouseCity.toLowerCase();
      const isLocal =
        normOrigin.includes('hồ chí minh') || normOrigin.includes('hcm')
          ? targetCity.includes('hồ chí minh') ||
            targetCity.includes('hcm') ||
            targetCity.includes('sài gòn')
          : targetCity.includes('hà nội') || targetCity.includes('ha noi');

      const now = new Date();
      const addDays = (d: number) => {
        const date = new Date(now.getTime() + d * 86400000);
        return date.toISOString().split('T')[0];
      };

      // 3. Truy vấn danh sách đối tác vận chuyển đang kích hoạt từ bảng fulfillment_carriers qua Prisma ORM
      let carriersFromDb: Array<{ carrierCode: string; carrierName: string }> = [];
      if (process.env.USE_IN_MEMORY_DB !== 'true') {
        try {
          const prisma = PrismaClientWrapper.getInstance();
          const carriers = await prisma.carrier.findMany({
            where: { isActive: true },
            orderBy: { id: 'asc' },
          });
          if (carriers && carriers.length > 0) {
            carriersFromDb = carriers.map((c) => ({
              carrierCode: c.carrierCode,
              carrierName: c.carrierName,
            }));
          }
        } catch {
          // Fallback nếu kết nối lỗi
        }
      }

      // Fallback 4 hãng chuẩn SRS khi chạy môi trường in-memory / test
      if (carriersFromDb.length === 0) {
        carriersFromDb = [
          { carrierCode: 'GHN', carrierName: 'Giao Hàng Nhanh' },
          { carrierCode: 'GHTK', carrierName: 'Giao Hàng Tiết Kiệm' },
          { carrierCode: 'VIETTEL_POST', carrierName: 'Viettel Post' },
          { carrierCode: 'JT_EXPRESS', carrierName: 'J&T Express' },
        ];
      }

      // 4. Bảng biểu phí tiêu chuẩn theo cấu hình nghiệp vụ vận tải từng hãng (SRS 3.6)
      const carrierPricingMatrix: Record<
        string,
        {
          localService: string;
          interService: string;
          localFee: number;
          interFee: number;
          localDays: number;
          interDays: number;
        }
      > = {
        GHN: {
          localService: 'Giao Nhanh Nội Thành',
          interService: 'Chuyển Phát Chuẩn Liên Tỉnh',
          localFee: 22000,
          interFee: 35000,
          localDays: 1,
          interDays: 3,
        },
        GHTK: {
          localService: 'GHTK Tiết Kiệm',
          interService: 'GHTK Liên Tỉnh',
          localFee: 20000,
          interFee: 32000,
          localDays: 2,
          interDays: 3,
        },
        VIETTEL_POST: {
          localService: 'Chuyển Phát Hỏa Tốc',
          interService: 'Chuyển Phát Nhanh',
          localFee: 25000,
          interFee: 38000,
          localDays: 1,
          interDays: 2,
        },
        JT_EXPRESS: {
          localService: 'J&T Tiêu Chuẩn',
          interService: 'J&T Tiết Kiệm',
          localFee: 18000,
          interFee: 30000,
          localDays: 2,
          interDays: 4,
        },
      };

      const quotes = carriersFromDb.map((carrier) => {
        const pricing = carrierPricingMatrix[carrier.carrierCode] || {
          localService: `${carrier.carrierName} Tiêu Chuẩn`,
          interService: `${carrier.carrierName} Liên Tỉnh`,
          localFee: 22000,
          interFee: 35000,
          localDays: 1,
          interDays: 3,
        };

        const days = isLocal ? pricing.localDays : pricing.interDays;
        return {
          carrier: carrier.carrierCode,
          carrierName: carrier.carrierName,
          serviceName: isLocal ? pricing.localService : pricing.interService,
          fee: isLocal ? pricing.localFee : pricing.interFee,
          estimatedDays: days,
          estimatedDeliveryDate: addDays(days),
        };
      });

      res.status(200).json({
        success: true,
        originWarehouse: {
          code: warehouseCode,
          name: warehouseName,
          city: warehouseCity,
        },
        destinationCity: city || 'Toàn quốc',
        isLocal,
        data: quotes,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Không thể tính toán cước vận chuyển.',
      });
    }
  }
}
