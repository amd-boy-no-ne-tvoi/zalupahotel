import { FastifyInstance } from 'fastify'
import { writeFile, mkdir } from 'fs/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { authenticate } from '../middleware/auth.js'

const UPLOAD_DIR = join(process.cwd(), 'uploads')
await mkdir(UPLOAD_DIR, { recursive: true })

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime',
])
const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export default async function uploadsRoutes(app: FastifyInstance) {
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const data = await request.file()
    if (!data) return reply.status(400).send({ error: 'No file' })

    if (!ALLOWED_MIME.has(data.mimetype)) {
      return reply.status(400).send({ error: 'Allowed: jpg, png, webp, mp4, mov' })
    }

    // Read the entire file into memory first, then write atomically.
    // This avoids all stream timing/truncation issues.
    const chunks: Buffer[] = []
    let size = 0

    for await (const chunk of data.file) {
      size += (chunk as Buffer).length
      if (size > MAX_SIZE) {
        return reply.status(400).send({ error: 'File too large (max 20MB)' })
      }
      chunks.push(chunk as Buffer)
    }

    const ext = extname(data.filename) || '.bin'
    const filename = `${randomUUID()}${ext}`
    const filepath = join(UPLOAD_DIR, filename)

    await writeFile(filepath, Buffer.concat(chunks))

    return { url: `/uploads/${filename}` }
  })
}
