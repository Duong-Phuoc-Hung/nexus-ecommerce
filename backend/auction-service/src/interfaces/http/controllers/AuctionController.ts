import { Request, Response } from 'express';
import { GetAuctionDetailUseCase } from '../../../application/use-cases/GetAuctionDetailUseCase';
import { AuctionNotFoundException } from '../../../domain/exceptions/AuctionNotFoundException';
import { IAuctionRepository } from '../../../domain/repositories/IAuctionRepository';

export class AuctionController {
  constructor(
    private readonly getAuctionDetailUseCase: GetAuctionDetailUseCase,
    private readonly auctionRepository: IAuctionRepository,
  ) {}

  public async getActive(_req: Request, res: Response): Promise<void> {
    const auctions = await this.auctionRepository.findActiveAuctions();
    res.status(200).json({
      success: true,
      data: auctions.map((a) => ({
        id: a.id,
        productId: a.productId,
        currentHighestBid: a.currentHighestBid,
        highestBidderId: a.highestBidderId,
        status: a.status,
        endTime: a.endTime,
      })),
    });
  }

  public async getById(req: Request, res: Response): Promise<void> {
    try {
      const auctionId = (req.params.id || 'auc_01hqz777live') as string;
      const auction = await this.getAuctionDetailUseCase.execute(auctionId);
      res.status(200).json({
        success: true,
        data: auction,
      });
    } catch (error) {
      if (error instanceof AuctionNotFoundException) {
        res.status(404).json({
          success: false,
          error: error.message,
        });
        return;
      }
      res.status(500).json({
        success: false,
        error: 'Internal Server Error',
      });
    }
  }

  public async placeBid(req: Request, res: Response): Promise<void> {
    const { bidderId, bidAmount } = req.body;
    res.status(200).json({
      success: true,
      message: 'Bid accepted by bidding engine (Skeleton mode)',
      data: {
        auctionId: req.params.id || 'auc_01hqz777live',
        bidderId: bidderId || 'usr_sample',
        acceptedAmount: bidAmount || 260.0,
        status: 'ACCEPTED',
      },
    });
  }
}
