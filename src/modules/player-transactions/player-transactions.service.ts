import prisma from '../../config/prisma-client.config';
import { TransactionType, CreateTransactionData, TransactionSummary } from './interfaces/transaction.interface';

export class PlayerTransactionsService {

  // ============================================
  // CREAR TRANSACCIÓN
  // ============================================
  async createTransaction(data: CreateTransactionData) {
    return await prisma.$transaction(async (tx) => {
      // Obtener usuario actual
      const user = await tx.user.findUnique({
        where: { id: data.userId },
      });

      if (!user) {
        throw new Error('User not found');
      }

      const balanceBefore = user.coins;
      let balanceAfter = balanceBefore;

      // Calcular nuevo balance según tipo de transacción
      switch (data.type) {
        case TransactionType.BET:
        case TransactionType.PURCHASE:
          // Restar dinero
          if (balanceBefore < data.amount) {
            throw new Error('Insufficient coins');
          }
          balanceAfter = balanceBefore - data.amount;
          break;

        case TransactionType.WIN:
        case TransactionType.REFUND:
        case TransactionType.BONUS:
          // Sumar dinero
          balanceAfter = balanceBefore + data.amount;
          break;

        default:
          throw new Error('Invalid transaction type');
      }

      // Actualizar balance del usuario
      await tx.user.update({
        where: { id: data.userId },
        data: { coins: balanceAfter },
      });

      // Crear registro de transacción
      const transaction = await tx.transaction.create({
        data: {
          userId: data.userId,
          roomId: data.roomId,
          type: data.type,
          amount: data.amount,
          balanceBefore,
          balanceAfter,
          description: data.description,
        },
      });

      console.log(
        ` Transaction created: ${data.type} ${data.amount} coins for user ${data.userId} (${balanceBefore} → ${balanceAfter})`
      );

      return transaction;
    });
  }

  // ============================================
  // PROCESAR APUESTAS DE SALA (MÚLTIPLES JUGADORES)
  // ============================================
  async processBets(roomId: string, playerIds: string[], betAmount: number) {
    return await prisma.$transaction(async (tx) => {
      const transactions = [];

      for (const playerId of playerIds) {
        const user = await tx.user.findUnique({
          where: { id: playerId },
        });

        if (!user) {
          throw new Error(`User ${playerId} not found`);
        }

        if (user.coins < betAmount) {
          throw new Error(`User ${playerId} has insufficient coins`);
        }

        const balanceBefore = user.coins;
        const balanceAfter = balanceBefore - betAmount;

        // Actualizar balance
        await tx.user.update({
          where: { id: playerId },
          data: { coins: balanceAfter },
        });

        // Crear transacción
        const transaction = await tx.transaction.create({
          data: {
            userId: playerId,
            roomId,
            type: TransactionType.BET,
            amount: betAmount,
            balanceBefore,
            balanceAfter,
          },
        });

        transactions.push(transaction);
      }

      console.log(` Processed ${transactions.length} bets for room ${roomId}`);
      return transactions;
    });
  }

  // ============================================
  // DISTRIBUIR PREMIOS
  // ============================================
  async distributeRewards(
    roomId: string,
    rewards: { userId: string; amount: number; position: number }[]
  ) {
    return await prisma.$transaction(async (tx) => {
      const transactions = [];

      for (const reward of rewards) {
        if (reward.amount <= 0) continue;

        const user = await tx.user.findUnique({
          where: { id: reward.userId },
        });

        if (!user) {
          console.warn(`️ User ${reward.userId} not found, skipping reward`);
          continue;
        }

        const balanceBefore = user.coins;
        const balanceAfter = balanceBefore + reward.amount;

        // Actualizar balance
        await tx.user.update({
          where: { id: reward.userId },
          data: { coins: balanceAfter },
        });

        // Crear transacción
        const transaction = await tx.transaction.create({
          data: {
            userId: reward.userId,
            roomId,
            type: TransactionType.WIN,
            amount: reward.amount,
            balanceBefore,
            balanceAfter,
            description: `Prize for position ${reward.position}`,
          },
        });

        transactions.push(transaction);

        console.log(
          ` Reward distributed: ${reward.amount} coins to user ${reward.userId} (position ${reward.position})`
        );
      }

      return transactions;
    });
  }

  // ============================================
  // REEMBOLSAR APUESTA (por desconexión, etc)
  // ============================================
  async refundBet(userId: string, roomId: string, amount: number) {
    return await this.createTransaction({
      userId,
      roomId,
      type: TransactionType.REFUND,
      amount,
      description: 'Bet refund',
    });
  }

  // ============================================
  // OBTENER HISTORIAL DE TRANSACCIONES
  // ============================================
  async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          room: {
            select: {
              id: true,
              gameType: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      }),
      prisma.transaction.count({ where: { userId } }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ============================================
  // OBTENER RESUMEN DE TRANSACCIONES
  // ============================================
  async getTransactionSummary(userId: string): Promise<TransactionSummary> {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
    });

    const summary = transactions.reduce(
      (acc, tx) => {
        acc.transactionCount++;

        switch (tx.type) {
          case TransactionType.BET:
          case TransactionType.PURCHASE:
            acc.totalBets += tx.amount;
            acc.netBalance -= tx.amount;
            break;

          case TransactionType.WIN:
            acc.totalWins += tx.amount;
            acc.netBalance += tx.amount;
            break;

          case TransactionType.REFUND:
            acc.totalRefunds += tx.amount;
            acc.netBalance += tx.amount;
            break;
        }

        return acc;
      },
      {
        totalBets: 0,
        totalWins: 0,
        totalRefunds: 0,
        netBalance: 0,
        transactionCount: 0,
      }
    );

    return summary;
  }

  // ============================================
  // VERIFICAR SI USUARIO TIENE FONDOS SUFICIENTES
  // ============================================
  async hasEnoughCoins(userId: string, amount: number): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      return false;
    }

    return user.coins >= amount;
  }

  // ============================================
  // OBTENER BALANCE ACTUAL
  // ============================================
  async getCurrentBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { coins: true },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user.coins;
  }
}