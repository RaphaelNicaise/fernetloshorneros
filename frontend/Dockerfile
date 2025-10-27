FROM node:20-alpine

# Instalar pnpm
RUN npm install -g pnpm@latest

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema si son necesarias
RUN apk add --no-cache git

# Copiar package.json y pnpm-lock.yaml
COPY package.json pnpm-lock.yaml* ./

# Limpiar caché de pnpm antes de instalar
RUN pnpm store prune

# Instalar dependencias con logs verbosos para debugging
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copiar archivos de configuración primero
COPY postcss.config.js tailwind.config.js ./

# Copiar el resto del código
COPY . .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "5173"]