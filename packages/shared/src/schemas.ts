import { z } from 'zod'

export const registerSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(8, 'Минимум 8 символов'),
  name: z.string().min(1).max(100),
  role: z.enum(['employee', 'owner']),
})

export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(1, 'Введите пароль'),
})

export const createPetSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.string().min(1).max(50),
  breed: z.string().max(100).optional(),
  notes: z.string().max(1000).optional(),
  ownerId: z.string().uuid(),
})

export const createCageSchema = z.object({
  number: z.string().min(1).max(20),
  zone: z.string().min(1).max(50),
  type: z.enum(['dog', 'cat', 'other']),
})

export const createStaySchema = z.object({
  petId: z.string().uuid(),
  cageId: z.string().uuid(),
  employeeId: z.string().uuid(),
  checkIn: z.string().datetime(),
})

export const dayStatusEnum = z.enum(['adaptation', 'calm', 'active', 'needs_control'])

export const reportMetricSchema = z.object({
  category: z.enum(['appetite', 'water', 'toilet', 'activity', 'mood', 'contact']),
  value: z.string().min(1),
  comment: z.string().max(500).optional(),
})

export const reportActivitySchema = z.object({
  activityType: z.string().min(1),
  completed: z.boolean(),
})

export const reportObservationSchema = z.object({
  observation: z.string().min(1).max(500),
  action: z.string().max(500).optional(),
  notifyOwner: z.boolean(),
})

export const createReportSchema = z.object({
  stayId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат: YYYY-MM-DD'),
  dayStatus: dayStatusEnum,
  metrics: z.array(reportMetricSchema),
  activities: z.array(reportActivitySchema),
  observations: z.array(reportObservationSchema),
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreatePetInput = z.infer<typeof createPetSchema>
export type CreateCageInput = z.infer<typeof createCageSchema>
export type CreateStayInput = z.infer<typeof createStaySchema>
export type CreateReportInput = z.infer<typeof createReportSchema>
