import bcrypt from 'bcryptjs'
import prisma from './lib/prisma.js'

async function main() {
  const email = process.env.ADMIN_EMAIL ?? 'admin@pethotel.ru'
  const password = process.env.ADMIN_PASSWORD ?? 'secret123'
  const name = process.env.ADMIN_NAME ?? 'Администратор'

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.log(`Admin already exists: ${email}`)
  } else {
    const passwordHash = await bcrypt.hash(password, 12)
    await prisma.user.create({ data: { email, passwordHash, name, role: 'admin' } })
    console.log(`Admin created: ${email} / ${password}`)
  }

  const cages = [
    { number: 'A1', zone: 'A', type: 'dog' as const },
    { number: 'A2', zone: 'A', type: 'dog' as const },
    { number: 'A3', zone: 'A', type: 'dog' as const },
    { number: 'B1', zone: 'B', type: 'cat' as const },
    { number: 'B2', zone: 'B', type: 'cat' as const },
    { number: 'C1', zone: 'C', type: 'other' as const },
  ]

  for (const cage of cages) {
    await prisma.cage.upsert({
      where: { number: cage.number },
      update: {},
      create: cage,
    })
  }
  console.log(`Cages seeded: ${cages.map(c => c.number).join(', ')}`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
