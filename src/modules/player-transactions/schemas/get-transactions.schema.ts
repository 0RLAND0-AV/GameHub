import { z } from 'zod';

export const GetTransactionsQuerySchema = z.object({
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('20').transform(Number),
});

export type GetTransactionsQueryDTO = z.infer<typeof GetTransactionsQuerySchema>;