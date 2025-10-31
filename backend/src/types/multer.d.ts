declare module 'multer' {
  const multer: any
  export = multer
}

declare namespace Express {
  namespace Multer {
    interface File {
      /** Nombre del archivo guardado en disco */
      filename: string
      /** Nombre original */
      originalname?: string
      mimetype?: string
      path?: string
      size?: number
    }
  }
}
