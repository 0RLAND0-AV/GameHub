import { Request, Response } from 'express';
import { PlayerTransactionsService } from './player-transactions.service';
import { ResponseFormatter } from '../../shared/utils/response-formatter.utils';

export class PlayerTransactionsController {
  private transactionsService: PlayerTransactionsService;

  constructor() {
    this.transactionsService = new PlayerTransactionsService();
  }

  // ============================================
  // OBTENER HISTORIAL DE TRANSACCIONES
  // ============================================
  getMyTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.transactionsService.getTransactionHistory(
        req.user.userId,
        page,
        limit
      );

      res.status(200).json(
        ResponseFormatter.success('Transactions retrieved successfully', result)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get transactions';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'GET_TRANSACTIONS_ERROR')
      );
    }
  };

  // ============================================
  // OBTENER RESUMEN DE TRANSACCIONES
  // ============================================
  getMyTransactionSummary = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const summary = await this.transactionsService.getTransactionSummary(
        req.user.userId
      );

      res.status(200).json(
        ResponseFormatter.success('Transaction summary retrieved successfully', summary)
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get summary';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'GET_SUMMARY_ERROR')
      );
    }
  };

  // ============================================
  // OBTENER BALANCE ACTUAL
  // ============================================
  getMyBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const balance = await this.transactionsService.getCurrentBalance(
        req.user.userId
      );

      res.status(200).json(
        ResponseFormatter.success('Balance retrieved successfully', { 
          coins: balance,
          userId: req.user.userId,
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to get balance';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'GET_BALANCE_ERROR')
      );
    }
  };

  // ============================================
  // VERIFICAR FONDOS SUFICIENTES
  // ============================================
  checkFunds = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json(
          ResponseFormatter.error('User not authenticated', 'NOT_AUTHENTICATED')
        );
        return;
      }

      const amount = parseInt(req.query.amount as string);

      if (!amount || amount <= 0) {
        res.status(400).json(
          ResponseFormatter.error('Invalid amount', 'INVALID_AMOUNT')
        );
        return;
      }

      const hasEnough = await this.transactionsService.hasEnoughCoins(
        req.user.userId,
        amount
      );

      res.status(200).json(
        ResponseFormatter.success('Funds check completed', { 
          hasEnoughCoins: hasEnough,
          requiredAmount: amount,
        })
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check funds';
      res.status(500).json(
        ResponseFormatter.error(errorMessage, 'CHECK_FUNDS_ERROR')
      );
    }
  };
}