import { IAuctionRepository } from '../domain/repositories/IAuctionRepository';
import { BuyNowInput, BuyNowUseCase } from './use-cases/BuyNowUseCase';
import { CancelAuctionInput, CancelAuctionUseCase } from './use-cases/CancelAuctionUseCase';
import { PlaceBidInput, PlaceBidUseCase } from './use-cases/PlaceBidUseCase';
import { UpdateAuctionInput, UpdateAuctionUseCase } from './use-cases/UpdateAuctionUseCase';

export interface AuctionMutationTransaction {
  run<T>(id: string, operation: (repository: IAuctionRepository) => Promise<T>): Promise<T>;
}

export function createAuctionMutations(transaction: AuctionMutationTransaction) {
  return {
    bid: {
      execute: (input: PlaceBidInput) =>
        transaction.run(input.auctionId, (repo) => new PlaceBidUseCase(repo).execute(input)),
    },
    buy: {
      execute: (input: BuyNowInput) =>
        transaction.run(input.auctionId, (repo) => new BuyNowUseCase(repo).execute(input)),
    },
    cancel: {
      execute: (input: CancelAuctionInput) =>
        transaction.run(input.auctionId, (repo) => new CancelAuctionUseCase(repo).execute(input)),
    },
    update: {
      execute: (input: UpdateAuctionInput) =>
        transaction.run(input.auctionId, (repo) => new UpdateAuctionUseCase(repo).execute(input)),
    },
  };
}

export function createInMemoryAuctionTransaction(
  repository: IAuctionRepository,
): AuctionMutationTransaction {
  const pending = new Map<string, Promise<unknown>>();
  return {
    async run(id, operation) {
      const previous = pending.get(id) ?? Promise.resolve();
      const next = previous.then(
        () => operation(repository),
        () => operation(repository),
      );
      pending.set(id, next);
      try {
        return await next;
      } finally {
        if (pending.get(id) === next) pending.delete(id);
      }
    },
  };
}
