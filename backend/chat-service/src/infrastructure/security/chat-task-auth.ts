import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest, AuthenticatedUser, verifyHs256Signature } from './auth';
import { IConversationRepository } from '../../domain/repositories/IConversationRepository';

// BE-01/BE-04 use verified JWTs without changing the authentication of existing routes.
export function requireChatTaskAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const match = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '');
    if (!match) throw new Error('Missing bearer');
    const parts = match[1].split('.');
    if (parts.length !== 3) throw new Error('Invalid token');
    const [header, payload, signature] = parts;
    if (JSON.parse(Buffer.from(header, 'base64url').toString()).alg !== 'HS256')
      throw new Error('Invalid algorithm');

    if (!verifyHs256Signature(header, payload, signature)) {
      throw new Error('Invalid signature');
    }
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString()) as AuthenticatedUser & {
      roles?: unknown;
      exp?: number;
      nbf?: number;
    };
    const role =
      typeof user.role === 'string'
        ? user.role
        : Array.isArray(user.roles)
          ? user.roles[0]
          : undefined;
    const now = Date.now() / 1000;
    if (
      typeof user.sub !== 'string' ||
      !user.sub.trim() ||
      typeof role !== 'string' ||
      !role.trim() ||
      !Number.isFinite(user.exp) ||
      user.exp! <= now ||
      (user.nbf !== undefined && (!Number.isFinite(user.nbf) || user.nbf > now))
    ) {
      throw new Error('Invalid claims');
    }
    (req as AuthenticatedRequest).user = { ...user, role: role.toUpperCase() };
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Bearer JWT hợp lệ là bắt buộc.' });
  }
}

// Verify staff identity even before the handover flag changes during an in-flight request.
export function verifyHandoverParticipant(conversations: IConversationRepository) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await conversations.findById(req.params.id as string);
      const role = (req as AuthenticatedRequest).user?.role;
      const isStaff = role === 'ADMIN' || role === 'SUPPORT_STAFF';
      if (
        conversation?.channelType === 'AI_BOT' &&
        (conversation.status === 'WAITING_STAFF' || isStaff)
      ) {
        requireChatTaskAuth(req, res, next);
      } else {
        next();
      }
    } catch {
      res
        .status(500)
        .json({ success: false, error: 'Không thể kiểm tra quyền truy cập hội thoại.' });
    }
  };
}
