import { Router, type Request, type Response } from 'express'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const multer = require('multer') as any
import fs from 'fs'
import path from 'path'

const uploadsRouter = Router()

// Directorio de destino para archivos subidos. En producción, se espera que sea un volumen montado.
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(process.cwd(), 'uploads');
console.log('[UPLOADS] Directorio configurado:', UPLOADS_DIR);

if (!fs.existsSync(UPLOADS_DIR)) {
  console.log('[UPLOADS] Creando directorio:', UPLOADS_DIR);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, _file: any, cb: (error: Error | null, destination: string) => void) => {
    cb(null, UPLOADS_DIR)
  },
  filename: (_req: Request, file: any, cb: (error: Error | null, filename: string) => void) => {
    const orig = file.originalname || 'file'
    const ext = path.extname(orig)
    const base = path.basename(orig, ext).replace(/\s+/g, '-').toLowerCase()
    const stamp = Date.now()
    cb(null, `${base}-${stamp}${ext}`)
  },
})

// Restricciones de archivos permitidos
const ALLOWED_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp'])
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp'])

const fileFilter = (_req: Request, file: any, cb: (error: Error | null, acceptFile?: boolean) => void) => {
  const ext = path.extname((file.originalname || '').toLowerCase())
  const mime = (file.mimetype || '').toLowerCase()
  const ok = ALLOWED_EXT.has(ext) && ALLOWED_MIME.has(mime)
  if (!ok) return cb(new Error('INVALID_FILETYPE'))
  cb(null, true)
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
})

// POST /uploads  (campo: file)
uploadsRouter.post('/', (req: any, res: Response) => {
  console.log('[UPLOADS] POST recibido');
  
  const handler = upload.single('file')
  handler(req, res as any, (err: any) => {
    if (err) {
      console.log('[UPLOADS] Error multer:', err.message, err.code);
      if (err.message === 'INVALID_FILETYPE') {
        return res.status(400).json({
          error: 'Formato de archivo no permitido',
          allowed: ['jpg', 'jpeg', 'png', 'webp'],
        })
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Archivo demasiado grande (máx 5MB)' })
      }
      return res.status(500).json({ error: 'Error al subir archivo', details: err.message })
    }

    const file = req.file as { filename: string } | undefined
    if (!file) {
      console.log('[UPLOADS] No se recibió archivo');
      return res.status(400).json({ error: 'Archivo no recibido' })
    }
    
    const filename = file.filename
    const filePath = `/uploads/${filename}`
    console.log('[UPLOADS] Archivo guardado:', filePath);
    res.status(201).json({ filename, path: filePath })
  })
})

// GET /uploads/list  -> Lista archivos disponibles en la carpeta de uploads
uploadsRouter.get('/list', (_req: Request, res: Response) => {
  try {
    const entries = fs.readdirSync(UPLOADS_DIR, { withFileTypes: true })
    // Solo archivos (no carpetas). Opcionalmente filtrar por extensiones de imagen
    const imageExt = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.bmp'])
    const files = entries
      .filter((d) => d.isFile())
      .map((d) => d.name)
      .filter((name) => imageExt.has(path.extname(name).toLowerCase()) || imageExt.size === 0)
      .map((name) => ({ name, path: `/uploads/${name}` }))

    // Ordenar por fecha de modificación descendente (recientes primero)
    files.sort((a, b) => {
      try {
        const aStat = fs.statSync(path.join(UPLOADS_DIR, a.name))
        const bStat = fs.statSync(path.join(UPLOADS_DIR, b.name))
        return bStat.mtimeMs - aStat.mtimeMs
      } catch {
        return 0
      }
    })

    res.json({ files })
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo listar archivos', message: err?.message })
  }
})

export default uploadsRouter