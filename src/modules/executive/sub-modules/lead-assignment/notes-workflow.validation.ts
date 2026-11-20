import { z } from 'zod';

export const sanitizePlainNote = (val: string): string => {
  return val.replace(/<[^>]*>?/gm, '').trim();
};

export const sendNoteToCustomerSchema = z.object({
  noteText: z
    .string()
    .trim()
    .min(3, 'Note must be at least 3 characters')
    .max(1000, 'Note cannot exceed 1000 characters')
    .refine((val) => !/<[^>]*>/g.test(val), {
      message: 'HTML tags are not allowed in notes',
    }),
  version: z.number().int().optional(),
});

export const customerRespondNoteSchema = z
  .object({
    action: z.enum(['ACCEPTED', 'EDITED']),
    editedNote: z
      .string()
      .trim()
      .max(1000, 'Note cannot exceed 1000 characters')
      .refine((val) => !/<[^>]*>/g.test(val), {
        message: 'HTML tags are not allowed in notes',
      })
      .optional(),
    version: z.number().int({ message: 'Version is required' }),
  })
  .refine(
    (data) => {
      if (data.action === 'EDITED') {
        return !!data.editedNote && data.editedNote.trim().length >= 3;
      }
      return true;
    },
    {
      message: 'Edited note must be at least 3 characters',
      path: ['editedNote'],
    }
  );

export const verifyNoteSchema = z.object({
  version: z.number().int({ message: 'Version is required' }),
});

export const forwardNoteSchema = z.object({
  version: z.number().int({ message: 'Version is required' }),
});

export const resendNoteSchema = z.object({
  newNoteText: z
    .string()
    .trim()
    .min(3, 'Note must be at least 3 characters')
    .max(1000, 'Note cannot exceed 1000 characters')
    .refine((val) => !/<[^>]*>/g.test(val), {
      message: 'HTML tags are not allowed in notes',
    }),
  reason: z.string().trim().max(500).optional(),
  version: z.number().int({ message: 'Version is required' }),
});
