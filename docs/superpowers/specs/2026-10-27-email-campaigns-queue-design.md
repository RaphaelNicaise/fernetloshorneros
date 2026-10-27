# Especificación de Diseño: Registro de Campañas de Email, Cola Persistente y Monitoreo en Vivo

- **Fecha:** 2026-10-27
- **Estado:** Aprobado por el usuario
- **Módulo:** `/admin/emails` y Backend Email Blast Engine

---

## 1. Contexto y Objetivos

Actualmente, cuando un administrador inicia un envío masivo de correos (*Email Blast*) desde `/admin/emails`, la API ejecuta una función asíncrona en memoria RAM (`sendBatch()` en `backend/src/routes/emailTemplates.ts`). 

### Problemas Detectados:
1. **Pérdida por reinicio de VPS o contenedor:** Si el servidor se actualiza, se reinicia o se corta el proceso de Node.js a mitad de un envío masivo, la ejecución se interrumpe y se pierde todo rastro.
2. **Sin trazabilidad ni auditoría:** No se sabe a quién se le envió y a quién no, lo que obliga a reenviar todo a ciegas (duplicando miles de correos a los primeros de la lista).
3. **Falta de rate-limiting:** Un bucle `for...of` no regulado puede saturar el servidor SMTP o recibir errores `429 Too Many Requests` de Resend.
4. **Cero visibilidad en tiempo real:** No existe registro histórico de campañas pasadas, barra de progreso en vivo, ni consola de logs de entrega.

### Objetivos de la Solución:
1. **Historial de Campañas:** Registro permanente en base de datos de cada campaña emitida (nombre, plantilla, asunto, fecha, estadísticas).
2. **Cola Persistente en MySQL:** Persistencia atómica de todos los destinatarios con estados individuales (`pendiente`, `enviando`, `enviado`, `fallido`).
3. **Resiliencia y Auto-Resumen:** Si el VPS se apaga o reinicia con una campaña en curso, el backend la retoma automáticamente al arrancar sin duplicar correos ni perder información.
4. **Control de Cadencia (Rate Limiting):** Envío secuencial o por micro-lotes controlados con pausas breves para garantizar alta entregabilidad.
5. **Monitoreo en Vivo y Controles Operativos:** Tablero en tiempo real con barra de progreso, tarjetas KPI, feed de logs en vivo y botones de control (*Pausar*, *Reanudar*, *Cancelar*, *Reintentar Fallidos*).

---

## 2. Requerimientos

### 2.1 Requerimientos de Base de Datos (MySQL)

#### Tabla `email_campanias`
* `id` INT AUTO_INCREMENT PRIMARY KEY
* `nombre` VARCHAR(255) NOT NULL
* `template_key` VARCHAR(100) NOT NULL
* `asunto` VARCHAR(255) NOT NULL
* `estado` ENUM('en_cola', 'procesando', 'pausada', 'completada', 'cancelada') DEFAULT 'en_cola'
* `total_destinatarios` INT DEFAULT 0
* `enviados_count` INT DEFAULT 0
* `fallidos_count` INT DEFAULT 0
* `creado_por` VARCHAR(100) DEFAULT 'admin'
* `fecha_inicio` TIMESTAMP NULL DEFAULT NULL
* `fecha_fin` TIMESTAMP NULL DEFAULT NULL
* `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
* `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
* Índices: `estado`, `created_at`

#### Tabla `email_campania_destinatarios`
* `id` INT AUTO_INCREMENT PRIMARY KEY
* `campania_id` INT NOT NULL
* `email` VARCHAR(255) NOT NULL
* `nombre` VARCHAR(255) DEFAULT NULL
* `estado` ENUM('pendiente', 'enviando', 'enviado', 'fallido') DEFAULT 'pendiente'
* `error_mensaje` TEXT DEFAULT NULL
* `intentos` INT DEFAULT 0
* `enviado_at` TIMESTAMP NULL DEFAULT NULL
* `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
* Foreign Key: `campania_id` REFERENCES `email_campanias(id)` ON DELETE CASCADE
* Índices: `(campania_id, estado)`, `estado`

---

### 2.2 Requerimientos de Backend & Worker

1. **Auto-migración en startup:** Al iniciar la base de datos (`connectDB()`), verificar y crear automáticamente las tablas `email_campanias` y `email_campania_destinatarios` si no existen, y registrar las columnas en `01-init.sql`.
2. **Worker Desacoplado (`campaignWorker.ts`):**
   * Procesa de a pequeños lotes (ej. 3 a 5 correos por segundo o con delay configurable de 150-250ms entre envíos) para cumplir con las cuotas del proveedor de correo sin bloqueos.
   * Transición de estados: Marca a `enviando` antes de llamar a `transporter.sendMail()`.
   * En caso de éxito: Actualiza a `enviado`, guarda `enviado_at = NOW()` e incrementa `enviados_count`.
   * En caso de fallo: Actualiza a `fallido`, guarda `error_mensaje = err.message` e incrementa `fallidos_count`.
   * Al finalizar todos los destinatarios de la campaña: Marca la campaña como `completada` y registra `fecha_fin = NOW()`.
3. **Resiliencia al Reinicio (Crash-Recovery):**
   * En `server.ts` (al levantar Node.js), inicializar `initCampaignWorker()`.
   * Si existen campañas en estado `procesando`:
     * Destinatarios que hayan quedado con estado `enviando` durante el crash se regresan a `pendiente` para no darlos por perdidos.
     * El worker reactiva automáticamente el procesamiento sin requerir intervención manual.
4. **Endpoints de la API (`/api/campaigns` & `/api/email-templates`):**
   * `POST /email-templates/:key/send-blast`: Recibe `nombreCampania`, filtros de audiencia o lista manual. Inserta la campaña y todos los destinatarios en lote (`bulkInsert`) con estado `pendiente`. Inicia el worker y responde de inmediato con `{ campaignId, total }`.
   * `GET /campaigns`: Listado paginado de campañas con totales y estados.
   * `GET /campaigns/:id`: Detalle completo de la campaña, contadores en tiempo real y logs de los destinatarios (con paginación o últimos 100).
   * `POST /campaigns/:id/pause`: Cambia el estado a `'pausada'`. El worker detiene el despacho de nuevos correos para esa campaña.
   * `POST /campaigns/:id/resume`: Cambia el estado a `'procesando'` y despierta el worker.
   * `POST /campaigns/:id/cancel`: Cambia el estado a `'cancelada'` y no envía los correos pendientes restantes.
   * `POST /campaigns/:id/retry-failed`: Actualiza los destinatarios `'fallido'` a `'pendiente'`, reinicia `fallidos_count` correspondiente y reactiva la campaña en `'procesando'`.

---

### 2.3 Requerimientos de Frontend (`/admin/emails`)

1. **Pestañas de Navegación:**
   * **Pestaña 1: Editor de Plantillas:** La funcionalidad existente de edición, variables y correos de prueba.
   * **Pestaña 2: Campañas e Historial:** Nueva vista de administración de campañas.
2. **Actualización de `SendBlastModal`:**
   * Campo de entrada para el **Nombre de la Campaña** (con valor por defecto autogenerado como *"Campaña [Nombre Plantilla] - [Fecha/Hora]"*).
   * Al confirmar el envío masivo, cierra el modal y redirige a la vista de monitoreo en vivo de la campaña creada.
3. **Vista de Campaña en Vivo / Monitoreo:**
   * **Barra de Progreso:** Porcentaje global animado con colores de estado.
   * **Tarjetas de Estadísticas:**
     * Total destinatarios.
     * Enviados (verde).
     * Pendientes (amarillo).
     * Fallidos (rojo).
   * **Botonera de Control:**
     * Si está enviando: Botón **Pausar** y Botón **Cancelar**.
     * Si está pausada: Botón **Reanudar**.
     * Si hay fallidos: Botón **Reintentar Fallidos**.
   * **Consola de Logs en Vivo:**
     * Lista scrollable con auto-scroll opcional.
     * Cada registro muestra: hora (`HH:mm:ss`), email del destinatario, estado (`badge` verde de éxito o rojo de error).
     * Si hubo error, tooltip o modal emergente con el motivo del rechazo del servidor.
   * **Polling Silencioso:** Consulta cada 2-3 segundos el endpoint `GET /campaigns/:id` mientras la campaña esté en estado `en_cola` o `procesando`.

---

## 3. Arquitectura y Componentes

### 3.1 Backend
* `db/sql/01-init.sql`: Definición DDL de las nuevas tablas.
* `backend/src/config/database.ts`: Migración automática de tablas en inicio.
* `backend/src/services/campaignService.ts`: Lógica de creación, consulta y actualización de campañas y destinatarios.
* `backend/src/services/campaignWorker.ts`: Worker en segundo plano con control de concurrencia, pacing y auto-recuperación.
* `backend/src/routes/campaigns.ts`: Rutas protegidas por `adminAuth` para campañas.
* `backend/src/routes/emailTemplates.ts`: Adaptación de `send-blast` para delegar en `campaignService`.
* `backend/src/index.ts`: Inicialización del worker al arrancar el servidor.

### 3.2 Frontend
* `frontend/app/admin/emails/page.tsx`: Incorporación de pestañas (Tabs) entre editor de plantillas e historial.
* `frontend/app/admin/emails/components/CampaignsList.tsx`: Tabla de historial de campañas pasadas y activas.
* `frontend/app/admin/emails/components/CampaignMonitorModal.tsx` o vista dedicada: Monitoreo en vivo de la campaña con barra de progreso, logs y botones de control.
* `frontend/app/admin/emails/components/SendBlastModal.tsx`: Incorporación del nombre de la campaña y redirección al monitor.

---

## 4. Pruebas y Criterios de Aceptación

1. **Persistencia y Trazabilidad:** Al enviar una campaña, se registra en `email_campanias` y cada destinatario queda en `email_campania_destinatarios` con estado inicial `pendiente`.
2. **Tolerancia a Fallos:** Si el proceso backend o contenedor de Docker se reinicia intencionalmente a mitad del envío, al arrancar retoma automáticamente los pendientes sin duplicar envíos a los ya marcados como `enviado`.
3. **Control Operativo:** Pausar detiene la salida de correos; Reanudar continúa la cola; Cancelar detiene el resto; Reintentar Fallidos procesa solo los fallidos.
4. **Monitoreo en Vivo:** La UI refleja en tiempo real el progreso de envíos y la consola de logs sin bloquear la navegación.
