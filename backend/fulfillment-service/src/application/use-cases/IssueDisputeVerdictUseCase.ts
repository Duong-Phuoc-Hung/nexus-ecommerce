import { ISupportCaseRepository } from '../../domain/repositories/ISupportCaseRepository';
import { ArbitrationVerdict } from '../../domain/entities/SupportCase';

export interface IssueDisputeVerdictInput {
  caseId: string;
  decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST';
  refundAmount?: number;
  liableParty?: 'SELLER' | 'BUYER' | 'CARRIER';
  note: string;
  arbitratorId?: string;
}

/**
 * UseCase: IssueDisputeVerdictUseCase
 * Ra phán quyết trọng tài cho tranh chấp giữa Người mua và Người bán
 * Kích hoạt đồng bộ sang Commerce Service nếu phán quyết hoàn tiền (SRS 2.3, 3.1.2)
 */
export class IssueDisputeVerdictUseCase {
  constructor(private readonly supportCaseRepository: ISupportCaseRepository) {}

  public async execute(input: IssueDisputeVerdictInput) {
    const rawId = (input.caseId || '').trim();
    if (!rawId) {
      throw new Error('caseId là bắt buộc.');
    }

    const caseItem = await this.supportCaseRepository.findById(rawId);
    if (!caseItem) {
      throw new Error(`Không tìm thấy hồ sơ khiếu nại với ID "${rawId}".`);
    }

    const verdict: ArbitrationVerdict = {
      decision: input.decision,
      refundAmount: input.refundAmount,
      liableParty: input.liableParty || 'SELLER',
      note: input.note,
      arbitratorId: input.arbitratorId,
    };

    caseItem.issueVerdict(verdict, input.arbitratorId);
    await this.supportCaseRepository.save(caseItem);

    // Đồng bộ trạng thái phán quyết sang commerce-service
    await this.notifyCommerceService(
      caseItem.orderId,
      input.decision,
      input.refundAmount,
      input.note,
      input.arbitratorId,
    );

    return caseItem.toDisputeDto();
  }

  private async notifyCommerceService(
    orderId: string,
    decision: 'REFUND_BUYER' | 'REJECT_BUYER' | 'REQUIRE_RETURN_FIRST',
    amount?: number,
    reason?: string,
    arbitratorId?: string,
  ) {
    const commerceUrl = (
      process.env.COMMERCE_SERVICE_URL ||
      `http://127.0.0.1:${process.env.COMMERCE_SERVICE_PORT || 4003}`
    ).replace(/\/$/, '');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);

      const headers = {
        'Content-Type': 'application/json',
        'x-user-id': arbitratorId || 'usr_support_arbitrator',
        'x-user-role': 'SUPPORT_STAFF',
      };

      if (decision === 'REFUND_BUYER') {
        await fetch(`${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/refund/execute`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            refundAmount: amount,
            reason: `Phán quyết trọng tài chấp thuận hoàn tiền: ${reason || 'Hoàn tiền cho người mua'}`,
          }),
          signal: controller.signal,
        }).catch(() => null);
      } else if (decision === 'REJECT_BUYER') {
        await fetch(`${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/refund/cancel`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            reason: `Phán quyết trọng tài từ chối khiếu nại: ${reason || 'Bác bỏ yêu cầu hoàn tiền'}`,
          }),
          signal: controller.signal,
        }).catch(() => null);
      } else if (decision === 'REQUIRE_RETURN_FIRST') {
        await fetch(`${commerceUrl}/api/v1/orders/${encodeURIComponent(orderId)}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({
            status: 'RETURN_PENDING',
            note: `Phán quyết yêu cầu người mua trả hàng hoàn tiền: ${reason || 'Chờ nhận lại kiện hàng'}`,
          }),
          signal: controller.signal,
        }).catch(() => null);
      }

      clearTimeout(timer);
    } catch (err: any) {
      console.warn('[IssueDisputeVerdictUseCase] Commerce refund sync notice:', err.message);
    }
  }
}
