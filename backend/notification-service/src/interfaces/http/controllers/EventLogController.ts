/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG HTTP CONTROLLER (SRS 2.7 & SRS 3.2.1)
 * =============================================================================
 * Cung cấp API truy vấn lịch sử kiểm toán sự kiện (EVENT_LOG.VIEW, EVENT_LOG.VIEW_DETAIL).
 * =============================================================================
 */

import { Request, Response } from 'express';
import { EventLogService } from '../../../application/services/EventLogService';
import { EventLog } from '../../../domain/entities/EventLog';

export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  public getRecentLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const logs = await this.eventLogService.getRecentLogs(limit);

      res.status(200).json({
        success: true,
        data: logs.map((l: EventLog) => l.toJSON()),
        total: logs.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  };

  public getLogByEventId = async (req: Request, res: Response): Promise<void> => {
    try {
      const eventId = String(req.params.eventId);
      const log = await this.eventLogService.getLogByEventId(eventId);

      if (!log) {
        res.status(404).json({
          success: false,
          error: { message: `Không tìm thấy bản ghi event_log với eventId "${eventId}".` },
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: log.toJSON(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  };
}
