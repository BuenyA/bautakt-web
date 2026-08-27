import { z } from 'zod';

/**
 * Mindestlaenge wie in bautakt-app (PASSWORD_MIN_LENGTH in
 * lib/utils/validationUtils.ts) und wie in den Supabase-Auth-Einstellungen.
 *
 * ⚠️ Der Client darf nie strenger validieren als der Server akzeptiert — der
 * dritte der drei Saetze aus dem Wiki der App. Wird die Regel serverseitig
 * geaendert, gehoert sie hier nachgezogen, nicht verschaerft.
 */
export const PASSWORD_MIN_LENGTH = 8;

export const emailSchema = z.email({ message: 'validation:email' });

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: 'validation:passwordMin' });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { message: 'validation:required' }),
});

export const signUpSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((values) => values.password === values.passwordConfirm, {
    message: 'validation:passwordMismatch',
    path: ['passwordConfirm'],
  });

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z
  .object({ password: passwordSchema, passwordConfirm: z.string() })
  .refine((values) => values.password === values.passwordConfirm, {
    message: 'validation:passwordMismatch',
    path: ['passwordConfirm'],
  });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
