import { z } from 'zod';

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores'),
  
  email: z
    .string()
    .email('Invalid email format')
    .min(5, 'Email must be at least 5 characters')
    .max(100, 'Email must be at most 100 characters'),
  
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(50, 'Password must be at most 50 characters'),
  
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(50, 'First name must be at most 50 characters')
    .optional(),
  
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(50, 'Last name must be at most 50 characters')
    .optional(),
});

export type RegisterDTO = z.infer<typeof RegisterSchema>;