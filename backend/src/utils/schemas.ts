import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  }),
});

export const saveSessionSchema = z.object({
  body: z
    .object({
      studentId: z
        .any()
        .transform((val) => {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? val : parsed;
        })
        .pipe(z.number().int().positive('Student ID must be a positive integer')),
      appointmentId: z
        .any()
        .optional()
        .transform((val) => {
          if (val === undefined || val === null || val === '') return null;
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? val : parsed;
        })
        .pipe(z.number().int().positive().nullable()),
      clinicianMode: z.enum(['counselor', 'doctor', 'multidisciplinary']).optional(),
    })
    .passthrough(),
});
