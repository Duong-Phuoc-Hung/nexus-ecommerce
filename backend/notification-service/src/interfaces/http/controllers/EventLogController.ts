/**
 * =============================================================================
 * PROJECT NEXUS - EVENT LOG HTTP CONTROLLER (SRS 2.7 & SRS 3.2.1)
 * =============================================================================
 * Cung cấp API truy vấn lịch sử kiểm toán sự kiện (EVENT_LOG.VIEW, EVENT_LOG.VIEW_DETAIL).
 * =============================================================================
 */

import crypto from 'node:crypto';
import { Request, Response } from 'express';
import { EventLogService } from '../../../application/services/EventLogService';
import { EventLog } from '../../../domain/entities/EventLog';
import { isInternalServiceRequest } from '../middleware/auth';

export class EventLogController {
  constructor(private readonly eventLogService: EventLogService) {}

  public getRecentLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const typeFilter =
        typeof req.query.type === 'string' ? req.query.type.trim().toLowerCase() : '';
      const sourceFilter =
        typeof req.query.sourceService === 'string'
          ? req.query.sourceService.trim().toLowerCase()
          : '';
      const statusFilter =
        typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
      const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';

      let logs = await this.eventLogService.getRecentLogs(Math.max(1, Math.min(200, limit || 50)));

      if (typeFilter) {
        logs = logs.filter((l) => l.type.toLowerCase().includes(typeFilter));
      }
      if (sourceFilter) {
        logs = logs.filter((l) => l.sourceService.toLowerCase().includes(sourceFilter));
      }
      if (statusFilter && statusFilter !== 'ALL') {
        logs = logs.filter((l) => l.status.toUpperCase() === statusFilter);
      }
      if (q) {
        logs = logs.filter(
          (l) =>
            l.eventId.toLowerCase().includes(q) ||
            l.type.toLowerCase().includes(q) ||
            l.sourceService.toLowerCase().includes(q) ||
            JSON.stringify(l.payload ?? {})
              .toLowerCase()
              .includes(q),
        );
      }

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

  public recordInternalEvent = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!isInternalServiceRequest(req)) {
        res.status(403).json({ success: false, error: 'Forbidden: internal service access only.' });
        return;
      }
      const { eventId, type, sourceService, payload, occurredAt, status } = req.body || {};
      if (!type || !sourceService) {
        res.status(400).json({ success: false, error: 'type and sourceService are required.' });
        return;
      }
      const saved = await this.eventLogService.recordEvent({
        eventId:
          typeof eventId === 'string' && eventId.trim()
            ? eventId.trim()
            : `evt_${crypto.randomUUID()}`,
        type: String(type).trim(),
        sourceService: String(sourceService).trim(),
        payload: payload ?? {},
        occurredAt: typeof occurredAt === 'string' ? occurredAt : undefined,
        status: typeof status === 'string' ? status : 'SUCCESS',
      });
      res.status(201).json({ success: true, data: saved.toJSON() });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: { message: (error as Error).message },
      });
    }
  };
}
