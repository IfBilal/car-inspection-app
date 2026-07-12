import { z } from 'zod';

export const clientSchema = z.object({
  full_name: z.string().trim().min(2, 'Name is required'),
  email: z.string().trim().email('Enter a valid email — the report is sent here'),
  phone: z.string().trim().optional().or(z.literal('')),
  address: z.string().trim().optional().or(z.literal('')),
});
export type ClientForm = z.infer<typeof clientSchema>;

export const vehicleSchema = z
  .object({
    registration_plate: z.string().trim().optional().or(z.literal('')),
    chassis_number: z.string().trim().optional().or(z.literal('')),
    vin: z.string().trim().optional().or(z.literal('')),
    make: z.string().trim().min(1, 'Make is required'),
    model: z.string().trim().min(1, 'Model is required'),
    // numeric fields arrive as strings from TextInputs; converted on save
    year: z
      .string()
      .optional()
      .refine((v) => !v || (/^\d{4}$/.test(v) && Number(v) >= 1900 && Number(v) <= 2100), 'Check the year'),
    colour: z.string().trim().optional().or(z.literal('')),
    trim: z.string().trim().optional().or(z.literal('')),
    engine_size: z.string().trim().optional().or(z.literal('')),
    transmission: z.string().optional().or(z.literal('')),
    fuel_type: z.string().optional().or(z.literal('')),
    drive_type: z.string().optional().or(z.literal('')),
    odometer_km: z
      .string()
      .optional()
      .refine((v) => !v || /^\d+$/.test(v), 'Numbers only'),
    seller: z.string().trim().optional().or(z.literal('')),
    purchase_price: z
      .string()
      .optional()
      .refine((v) => !v || /^\d+(\.\d+)?$/.test(v), 'Numbers only'),
  })
  .refine((v) => !!(v.registration_plate || v.chassis_number || v.vin), {
    message: 'Enter at least one of plate, chassis or VIN',
    path: ['registration_plate'],
  });
export type VehicleForm = z.infer<typeof vehicleSchema>;

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Your name is required'),
    company_name: z.string().trim().optional().or(z.literal('')),
    email: z.string().trim().email('Enter a valid email'),
    password: z.string().min(8, 'At least 8 characters'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: 'Passwords don’t match', path: ['confirm'] });
export type RegisterForm = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginForm = z.infer<typeof loginSchema>;
