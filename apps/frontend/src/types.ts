export type Role = 'admin' | 'employee' | 'owner'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  phone?: string
}
