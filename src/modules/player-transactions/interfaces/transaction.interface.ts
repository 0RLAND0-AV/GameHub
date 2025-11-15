export enum TransactionType {
  BET = 'BET',
  WIN = 'WIN',
  REFUND = 'REFUND',
  BONUS = 'BONUS',
  PURCHASE = 'PURCHASE',
}

export interface ITransaction {
  id: string;
  userId: string;
  roomId?: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  createdAt: Date;
}

export interface CreateTransactionData {
  userId: string;
  roomId?: string;
  type: TransactionType;
  amount: number;
  description?: string;
}

export interface TransactionSummary {
  totalBets: number;
  totalWins: number;
  totalRefunds: number;
  netBalance: number;
  transactionCount: number;
}