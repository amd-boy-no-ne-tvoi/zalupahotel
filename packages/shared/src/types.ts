export type Role = 'admin' | 'employee' | 'owner'
export type DayStatus = 'adaptation' | 'calm' | 'active' | 'needs_control'
export type StayStatus = 'active' | 'completed'
export type CageType = 'dog' | 'cat' | 'other'
export type MetricCategory = 'appetite' | 'water' | 'toilet' | 'activity' | 'mood' | 'contact'

export interface User {
  id: string
  email: string
  name: string
  role: Role
}

export interface Pet {
  id: string
  name: string
  species: string
  breed?: string
  ownerId: string
  photoUrl?: string
  notes?: string
  owner?: User
}

export interface Cage {
  id: string
  number: string
  zone: string
  type: CageType
  isOccupied: boolean
}

export interface Stay {
  id: string
  petId: string
  cageId: string
  employeeId: string
  checkIn: string
  checkOut?: string
  status: StayStatus
  pet?: Pet
  cage?: Cage
  employee?: User
}

export interface ReportMetric {
  id: string
  category: MetricCategory
  value: string
  comment?: string
}

export interface ReportActivity {
  id: string
  activityType: string
  completed: boolean
}

export interface ReportObservation {
  id: string
  observation: string
  action?: string
  notifyOwner: boolean
}

export interface Report {
  id: string
  stayId: string
  employeeId: string
  date: string
  dayStatus: DayStatus
  createdAt: string
  metrics: ReportMetric[]
  activities: ReportActivity[]
  observations: ReportObservation[]
  stay?: Stay
  employee?: User
}

export interface ApiError {
  error: string
  details?: unknown
}
