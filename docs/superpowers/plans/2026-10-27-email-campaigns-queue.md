# Email Campaigns Queue, Persistence & Live Monitoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a durable MySQL-backed email campaign queue with background rate-limiting, crash-recovery on server reboot, and an admin live-monitoring dashboard with real-time logs, progress tracking, and control buttons (Pause, Resume, Cancel, Retry).

**Architecture:** 
1. Database Persistence: Two relational MySQL tables (`email_campanias` and `email_campania_destinatarios`) to guarantee that all recipients are persisted before dispatch begins.
2. Background Worker with Crash-Recovery: A decoupled worker in Node.js that processes pending recipients sequentially with rate-limiting (pacing) to protect SMTP/Resend limits. On boot, `initCampaignWorker` restores any interrupted `'procesando'` campaigns and resets orphaned `'enviando'` recipients back to `'pendiente'`.
3. RESTful Control Endpoints: `/campaigns` routes to manage campaigns, fetch live stats and paginated recipient logs, and control state transitions (pause, resume, cancel, retry-failed).
4. Real-Time Admin UI: Tabs in `/admin/emails` for "Plantillas" and "Campañas", incorporating a Live Monitoring Modal with progress bars, KPI metric cards, interactive controls, and an auto-scrolling log console polling every 2.5s.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Express, Sequelize, MySQL 8.0, Tailwind CSS, Lucide React, Jest.

## Global Constraints
- Database compatibility: MySQL 8.0 using Sequelize direct queries (`sequelize.query`) consistent with existing codebase.
- Zero extra container dependencies (no Redis).
- Rate limiting: 5 emails/sec (200ms pacing delay) to prevent SMTP/Resend 429 errors.
- Theme consistency: Dark theme with `#0b0a07`, `#14120f`, `border-white/10`, and `#AA6F3B` bronze accents.
- All backend routes in `/campaigns` must be protected by `adminAuth`.

---

### Task 1: Database Schema & Startup Auto-Migration

**Files:**
- Modify: `db/sql/01-init.sql:180-210`
- Modify: `backend/src/config/database.ts:35-65`

**Interfaces:**
- Produces: `email_campanias` and `email_campania_destinatarios` tables in MySQL.

- [ ] **Step 1: Add DDL to `db/sql/01-init.sql`**

Append the table definitions to `db/sql/01-init.sql`:
```sql
-- Tabla para registrar campañas de email masivas
CREATE TABLE IF NOT EXISTS email_campanias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(255) NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  asunto VARCHAR(255) NOT NULL,
  estado ENUM('en_cola', 'procesando', 'pausada', 'completada', 'cancelada') DEFAULT 'en_cola',
  total_destinatarios INT DEFAULT 0,
  enviados_count INT DEFAULT 0,
  fallidos_count INT DEFAULT 0,
  creado_por VARCHAR(100) DEFAULT 'admin',
  fecha_inicio TIMESTAMP NULL DEFAULT NULL,
  fecha_fin TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_campanias_estado (estado),
  INDEX idx_campanias_created (created_at)
);

-- Tabla para destinatarios individuales de cada campaña
CREATE TABLE IF NOT EXISTS email_campania_destinatarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  campania_id INT NOT NULL,
  email VARCHAR(255) NOT NULL,
  nombre VARCHAR(255) DEFAULT NULL,
  estado ENUM('pendiente', 'enviando', 'enviado', 'fallido') DEFAULT 'pendiente',
  error_mensaje TEXT DEFAULT NULL,
  intentos INT DEFAULT 0,
  enviado_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (campania_id) REFERENCES email_campanias(id) ON DELETE CASCADE,
  INDEX idx_destinatarios_campania_estado (campania_id, estado),
  INDEX idx_destinatarios_estado (estado)
);
```

- [ ] **Step 2: Add auto-migration in `backend/src/config/database.ts`**

In `connectDB()`, add safe startup table creation so existing running databases receive the tables without requiring a manual reset:
```ts
try {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS email_campanias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(255) NOT NULL,
      template_key VARCHAR(100) NOT NULL,
      asunto VARCHAR(255) NOT NULL,
      estado ENUM('en_cola', 'procesando', 'pausada', 'completada', 'cancelada') DEFAULT 'en_cola',
      total_destinatarios INT DEFAULT 0,
      enviados_count INT DEFAULT 0,
      fallidos_count INT DEFAULT 0,
      creado_por VARCHAR(100) DEFAULT 'admin',
      fecha_inicio TIMESTAMP NULL DEFAULT NULL,
      fecha_fin TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_campanias_estado (estado),
      INDEX idx_campanias_created (created_at)
    );
  `);

  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS email_campania_destinatarios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      campania_id INT NOT NULL,
      email VARCHAR(255) NOT NULL,
      nombre VARCHAR(255) DEFAULT NULL,
      estado ENUM('pendiente', 'enviando', 'enviado', 'fallido') DEFAULT 'pendiente',
      error_mensaje TEXT DEFAULT NULL,
      intentos INT DEFAULT 0,
      enviado_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (campania_id) REFERENCES email_campanias(id) ON DELETE CASCADE,
      INDEX idx_destinatarios_campania_estado (campania_id, estado),
      INDEX idx_destinatarios_estado (estado)
    );
  `);
} catch (e) {
  logger.warn('Email campaigns tables migration check:', e);
}
```

- [ ] **Step 3: Verify backend types and build**

Run: `pnpm --filter backend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit changes**

```bash
git add db/sql/01-init.sql backend/src/config/database.ts
git commit -m "feat(db): add email campaigns and recipients schema with auto-migration"
```

---

### Task 2: Backend Campaign Types and Service

**Files:**
- Create: `backend/src/types/campaigns.ts`
- Create: `backend/src/services/campaignService.ts`
- Create: `backend/src/services/__tests__/campaignService.test.ts`

**Interfaces:**
- Consumes: `sequelize` from `@/config/database`.
- Produces: `campaignService` methods:
  - `createCampaignWithRecipients(...)`
  - `getCampaigns(...)`
  - `getCampaignById(id)`
  - `getCampaignLogs(id, options)`
  - `updateCampaignStatus(id, status)`
  - `retryFailedRecipients(id)`

- [ ] **Step 1: Create `backend/src/types/campaigns.ts`**

```ts
export type CampaignStatus = 'en_cola' | 'procesando' | 'pausada' | 'completada' | 'cancelada';
export type RecipientStatus = 'pendiente' | 'enviando' | 'enviado' | 'fallido';

export interface Campaign {
  id: number;
  nombre: string;
  template_key: string;
  asunto: string;
  estado: CampaignStatus;
  total_destinatarios: number;
  enviados_count: number;
  fallidos_count: number;
  creado_por: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipient {
  id: number;
  campania_id: number;
  email: string;
  nombre: string | null;
  estado: RecipientStatus;
  error_mensaje: string | null;
  intentos: number;
  enviado_at: string | null;
  created_at: string;
}

export interface CreateCampaignDTO {
  nombre: string;
  template_key: string;
  asunto: string;
  recipients: Array<{ email: string; nombre?: string }>;
  creado_por?: string;
}
```

- [ ] **Step 2: Create unit test `backend/src/services/__tests__/campaignService.test.ts`**

```ts
import { campaignService } from '../campaignService';
import sequelize from '@/config/database';

jest.mock('@/config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

describe('campaignService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates a campaign with recipients in transaction', async () => {
    const mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
    (sequelize.query as jest.Mock)
      .mockResolvedValueOnce([1]) // INSERT INTO email_campanias
      .mockResolvedValueOnce([]); // INSERT INTO email_campania_destinatarios

    const result = await campaignService.createCampaignWithRecipients({
      nombre: 'Test Campaign',
      template_key: 'compra_confirmacion',
      asunto: 'Asunto Test',
      recipients: [
        { email: 'test1@horneros.com', nombre: 'Test 1' },
        { email: 'test2@horneros.com', nombre: 'Test 2' },
      ],
    });

    expect(result.id).toBe(1);
    expect(result.total_destinatarios).toBe(2);
    expect(mockTransaction.commit).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Implement `backend/src/services/campaignService.ts`**

```ts
import sequelize from '@/config/database';
import { QueryTypes } from 'sequelize';
import { Campaign, CampaignRecipient, CampaignStatus, CreateCampaignDTO } from '@/types/campaigns';

export const campaignService = {
  async createCampaignWithRecipients(data: CreateCampaignDTO): Promise<Campaign> {
    const transaction = await sequelize.transaction();
    try {
      const [campaignId]: any = await sequelize.query(
        `INSERT INTO email_campanias (nombre, template_key, asunto, estado, total_destinatarios, creado_por)
         VALUES (:nombre, :template_key, :asunto, 'en_cola', :total, :creado_por)`,
        {
          replacements: {
            nombre: data.nombre,
            template_key: data.template_key,
            asunto: data.asunto,
            total: data.recipients.length,
            creado_por: data.creado_por || 'admin',
          },
          type: QueryTypes.INSERT,
          transaction,
        }
      );

      // Insert recipients in chunks of 500 to prevent query packet overflow
      const chunkSize = 500;
      for (let i = 0; i < data.recipients.length; i += chunkSize) {
        const chunk = data.recipients.slice(i, i + chunkSize);
        const valuePlaceholders: string[] = [];
        const replacements: any[] = [];

        chunk.forEach((r) => {
          valuePlaceholders.push('(?, ?, ?, ?)');
          replacements.push(campaignId, r.email.trim().toLowerCase(), r.nombre ? r.nombre.trim() : null, 'pendiente');
        });

        const insertSql = `INSERT INTO email_campania_destinatarios (campania_id, email, nombre, estado) VALUES ${valuePlaceholders.join(', ')}`;
        await sequelize.query(insertSql, {
          replacements,
          type: QueryTypes.INSERT,
          transaction,
        });
      }

      await transaction.commit();

      const campaign = await this.getCampaignById(Number(campaignId));
      if (!campaign) throw new Error('Error al recuperar campaña creada');
      return campaign;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async getCampaigns(options: { page?: number; limit?: number; estado?: string } = {}): Promise<{ campaigns: Campaign[]; total: number }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(options.limit) || 20));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = [];
    const replacements: Record<string, any> = { limit, offset };

    if (options.estado) {
      whereClauses.push('estado = :estado');
      replacements.estado = options.estado;
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countResult = await sequelize.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_campanias ${whereSql}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = countResult[0]?.count || 0;

    const campaigns = await sequelize.query<Campaign>(
      `SELECT * FROM email_campanias ${whereSql} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    return { campaigns, total };
  },

  async getCampaignById(id: number): Promise<Campaign | null> {
    const rows = await sequelize.query<Campaign>(
      `SELECT * FROM email_campanias WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.SELECT }
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async getCampaignLogs(id: number, options: { page?: number; limit?: number; estado?: string } = {}): Promise<{ logs: CampaignRecipient[]; total: number }> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Math.min(200, Number(options.limit) || 50));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ['campania_id = :id'];
    const replacements: Record<string, any> = { id, limit, offset };

    if (options.estado) {
      whereClauses.push('estado = :estado');
      replacements.estado = options.estado;
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`;

    const countResult = await sequelize.query<{ count: number }>(
      `SELECT COUNT(*) as count FROM email_campania_destinatarios ${whereSql}`,
      { replacements, type: QueryTypes.SELECT }
    );
    const total = countResult[0]?.count || 0;

    const logs = await sequelize.query<CampaignRecipient>(
      `SELECT * FROM email_campania_destinatarios ${whereSql} ORDER BY id DESC LIMIT :limit OFFSET :offset`,
      { replacements, type: QueryTypes.SELECT }
    );

    return { logs, total };
  },

  async updateCampaignStatus(id: number, estado: CampaignStatus): Promise<void> {
    const updates: string[] = ['estado = :estado'];
    const replacements: Record<string, any> = { id, estado };

    if (estado === 'procesando') {
      updates.push('fecha_inicio = COALESCE(fecha_inicio, NOW())');
    } else if (estado === 'completada' || estado === 'cancelada') {
      updates.push('fecha_fin = NOW()');
    }

    await sequelize.query(
      `UPDATE email_campanias SET ${updates.join(', ')} WHERE id = :id`,
      { replacements, type: QueryTypes.UPDATE }
    );
  },

  async retryFailedRecipients(id: number): Promise<number> {
    const [result]: any = await sequelize.query(
      `UPDATE email_campania_destinatarios 
       SET estado = 'pendiente', error_mensaje = NULL, intentos = intentos + 1 
       WHERE campania_id = :id AND estado = 'fallido'`,
      { replacements: { id }, type: QueryTypes.UPDATE }
    );

    // Recalculate failed count in campaign
    await sequelize.query(
      `UPDATE email_campanias 
       SET fallidos_count = 0, estado = 'procesando', fecha_fin = NULL 
       WHERE id = :id`,
      { replacements: { id }, type: QueryTypes.UPDATE }
    );

    return result?.affectedRows || 0;
  },
};
```

- [ ] **Step 4: Run unit tests**

Run: `npx jest backend/src/services/__tests__/campaignService.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add backend/src/types/campaigns.ts backend/src/services/campaignService.ts backend/src/services/__tests__/campaignService.test.ts
git commit -m "feat(backend): implement campaignService with atomic chunked batching and retry logic"
```

---

### Task 3: Backend Campaign Worker with Crash-Recovery and Rate Limiting

**Files:**
- Create: `backend/src/services/campaignWorker.ts`
- Modify: `backend/src/index.ts:20-30,85-115`
- Create: `backend/src/services/__tests__/campaignWorker.test.ts`

**Interfaces:**
- Consumes: `campaignService`, `transporter` from `@/config/mail`, `emailTemplateService`.
- Produces:
  - `startCampaignWorker(campaignId: number): Promise<void>`
  - `pauseCampaign(campaignId: number): Promise<void>`
  - `resumeCampaign(campaignId: number): Promise<void>`
  - `cancelCampaign(campaignId: number): Promise<void>`
  - `initCampaignWorker(): Promise<void>` (crash-recovery on startup)

- [ ] **Step 1: Create unit test `backend/src/services/__tests__/campaignWorker.test.ts`**

```ts
import { campaignWorker } from '../campaignWorker';
import { campaignService } from '../campaignService';
import sequelize from '@/config/database';

jest.mock('@/config/database', () => ({
  query: jest.fn(),
  transaction: jest.fn(),
}));

jest.mock('../campaignService', () => ({
  campaignService: {
    getCampaignById: jest.fn(),
    updateCampaignStatus: jest.fn(),
  },
}));

describe('campaignWorker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initCampaignWorker resets stuck sending states and resumes in-progress campaigns', async () => {
    (sequelize.query as jest.Mock)
      .mockResolvedValueOnce([]) // UPDATE sending -> pendiente
      .mockResolvedValueOnce([{ id: 10 }]); // SELECT campaigns in 'procesando'

    (campaignService.getCampaignById as jest.Mock).mockResolvedValue({
      id: 10,
      estado: 'procesando',
      template_key: 'compra_confirmacion',
      asunto: 'Test',
    });

    await campaignWorker.initCampaignWorker();

    expect(sequelize.query).toHaveBeenCalledWith(
      expect.stringContaining("estado = 'pendiente'"),
      expect.any(Object)
    );
  });
});
```

- [ ] **Step 2: Implement `backend/src/services/campaignWorker.ts`**

```ts
import sequelize from '@/config/database';
import { QueryTypes } from 'sequelize';
import { transporter } from '@/config/mail';
import { emailTemplateService } from './emailTemplateService';
import { getDefaultTemplate } from './mailService';
import { campaignService } from './campaignService';
import { logger } from '@/utils/logger';
import { CampaignRecipient } from '@/types/campaigns';

const activeCampaigns = new Set<number>();
const pausedCampaigns = new Set<number>();
const cancelledCampaigns = new Set<number>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const campaignWorker = {
  async startCampaignWorker(campaignId: number): Promise<void> {
    if (activeCampaigns.has(campaignId)) {
      logger.info(`Campaign worker #${campaignId} ya se encuentra en ejecución.`);
      return;
    }

    pausedCampaigns.delete(campaignId);
    cancelledCampaigns.delete(campaignId);
    activeCampaigns.add(campaignId);

    // Run detached in background
    this.runLoop(campaignId).finally(() => {
      activeCampaigns.delete(campaignId);
      pausedCampaigns.delete(campaignId);
      cancelledCampaigns.delete(campaignId);
    });
  },

  async runLoop(campaignId: number): Promise<void> {
    try {
      const campaign = await campaignService.getCampaignById(campaignId);
      if (!campaign) {
        logger.error(`Campaign #${campaignId} no encontrada para procesar.`);
        return;
      }

      await campaignService.updateCampaignStatus(campaignId, 'procesando');

      // Resolve email template
      let template = await emailTemplateService.getTemplate(campaign.template_key);
      let subject = template?.subject || campaign.asunto;
      let htmlContent = template?.html_content;

      if (!htmlContent) {
        const defaultTpl = getDefaultTemplate(campaign.template_key);
        subject = subject || defaultTpl.subject;
        htmlContent = defaultTpl.html;
      }

      const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER;
      const batchSize = 10;
      const pacingDelayMs = 200; // 5 emails/second max

      while (true) {
        // Check paused or cancelled
        if (pausedCampaigns.has(campaignId)) {
          await campaignService.updateCampaignStatus(campaignId, 'pausada');
          logger.info(`Campaña #${campaignId} pausada por el usuario.`);
          break;
        }

        if (cancelledCampaigns.has(campaignId)) {
          await campaignService.updateCampaignStatus(campaignId, 'cancelada');
          logger.info(`Campaña #${campaignId} cancelada por el usuario.`);
          break;
        }

        // Fetch next batch of pending recipients
        const pendingRecipients = await sequelize.query<CampaignRecipient>(
          `SELECT * FROM email_campania_destinatarios 
           WHERE campania_id = :campaignId AND estado = 'pendiente' 
           ORDER BY id ASC LIMIT :batchSize`,
          {
            replacements: { campaignId, batchSize },
            type: QueryTypes.SELECT,
          }
        );

        if (pendingRecipients.length === 0) {
          // Finished all recipients!
          await campaignService.updateCampaignStatus(campaignId, 'completada');
          logger.info(`Campaña #${campaignId} completada exitosamente.`);
          break;
        }

        for (const recipient of pendingRecipients) {
          if (pausedCampaigns.has(campaignId) || cancelledCampaigns.has(campaignId)) {
            break;
          }

          // Mark recipient as 'enviando'
          await sequelize.query(
            `UPDATE email_campania_destinatarios SET estado = 'enviando' WHERE id = :id`,
            { replacements: { id: recipient.id }, type: QueryTypes.UPDATE }
          );

          // Variable replacements
          const personalizedSubject = (subject || campaign.asunto)
            .replace(/{{nombre}}/g, recipient.nombre || 'Cliente')
            .replace(/{{email}}/g, recipient.email);

          const personalizedHtml = (htmlContent || '')
            .replace(/{{nombre}}/g, recipient.nombre || 'Cliente')
            .replace(/{{email}}/g, recipient.email);

          try {
            await transporter.sendMail({
              from: `"Fernet Los Horneros" <${fromEmail}>`,
              to: recipient.email,
              subject: personalizedSubject,
              html: personalizedHtml,
            });

            // Mark sent & update counter
            await sequelize.query(
              `UPDATE email_campania_destinatarios 
               SET estado = 'enviado', enviado_at = NOW(), error_mensaje = NULL 
               WHERE id = :id`,
              { replacements: { id: recipient.id }, type: QueryTypes.UPDATE }
            );

            await sequelize.query(
              `UPDATE email_campanias SET enviados_count = enviados_count + 1 WHERE id = :campaignId`,
              { replacements: { campaignId }, type: QueryTypes.UPDATE }
            );
          } catch (err: any) {
            const errorMsg = err?.message || 'Error de envío desconocido';
            logger.error(`Error enviando a ${recipient.email} (Campaña #${campaignId}):`, errorMsg);

            await sequelize.query(
              `UPDATE email_campania_destinatarios 
               SET estado = 'fallido', error_mensaje = :errorMsg 
               WHERE id = :id`,
              { replacements: { id: recipient.id, errorMsg }, type: QueryTypes.UPDATE }
            );

            await sequelize.query(
              `UPDATE email_campanias SET fallidos_count = fallidos_count + 1 WHERE id = :campaignId`,
              { replacements: { campaignId }, type: QueryTypes.UPDATE }
            );
          }

          // Delay for rate limiting
          await sleep(pacingDelayMs);
        }
      }
    } catch (error) {
      logger.error(`Error fatal en el loop de la campaña #${campaignId}:`, error);
    }
  },

  async pauseCampaign(campaignId: number): Promise<void> {
    pausedCampaigns.add(campaignId);
    await campaignService.updateCampaignStatus(campaignId, 'pausada');
  },

  async resumeCampaign(campaignId: number): Promise<void> {
    pausedCampaigns.delete(campaignId);
    cancelledCampaigns.delete(campaignId);
    this.startCampaignWorker(campaignId);
  },

  async cancelCampaign(campaignId: number): Promise<void> {
    cancelledCampaigns.add(campaignId);
    pausedCampaigns.delete(campaignId);
    await campaignService.updateCampaignStatus(campaignId, 'cancelada');
  },

  async retryFailed(campaignId: number): Promise<void> {
    await campaignService.retryFailedRecipients(campaignId);
    this.startCampaignWorker(campaignId);
  },

  /**
   * Crash-recovery on server startup:
   * 1. Reverts any stuck 'enviando' recipients to 'pendiente'.
   * 2. Automatically restarts campaigns that were in 'procesando' or 'en_cola'.
   */
  async initCampaignWorker(): Promise<void> {
    try {
      // Revert orphaned sending state from previous crash
      await sequelize.query(
        `UPDATE email_campania_destinatarios 
         SET estado = 'pendiente' 
         WHERE estado = 'enviando'`,
        { type: QueryTypes.UPDATE }
      );

      // Find in-progress campaigns
      const interruptedCampaigns = await sequelize.query<{ id: number }>(
        `SELECT id FROM email_campanias WHERE estado IN ('procesando', 'en_cola') ORDER BY id ASC`,
        { type: QueryTypes.SELECT }
      );

      if (interruptedCampaigns.length > 0) {
        logger.info(`[Crash-Recovery] Reanudando ${interruptedCampaigns.length} campañas interrumpidas...`);
        for (const c of interruptedCampaigns) {
          this.startCampaignWorker(c.id);
        }
      }
    } catch (err) {
      logger.error('[Crash-Recovery] Error inicializando campaignWorker:', err);
    }
  },
};
```

- [ ] **Step 3: Wire `initCampaignWorker` into `backend/src/index.ts`**

In `backend/src/index.ts`, import `campaignWorker` and invoke `campaignWorker.initCampaignWorker()` right after `connectDB()`:
```ts
import { campaignWorker } from '@/services/campaignWorker';
```
Inside `startServer()`:
```ts
await connectDB({ sync: false });
campaignWorker.initCampaignWorker().catch((err) => logger.error('Error en initCampaignWorker:', err));
```

- [ ] **Step 4: Run unit tests**

Run: `npx jest backend/src/services/__tests__/campaignWorker.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit changes**

```bash
git add backend/src/services/campaignWorker.ts backend/src/services/__tests__/campaignWorker.test.ts backend/src/index.ts
git commit -m "feat(backend): implement campaignWorker with crash recovery, pacing and pause/resume logic"
```

---

### Task 4: Backend Routes & Controller (`/campaigns` & Updated `/send-blast`)

**Files:**
- Create: `backend/src/routes/campaigns.ts`
- Modify: `backend/src/routes/emailTemplates.ts:184-250`
- Modify: `backend/src/index.ts:20-25,80-85`
- Create: `backend/src/routes/__tests__/campaigns.test.ts`

**Interfaces:**
- Consumes: `campaignService`, `campaignWorker`, `audiencesService`, `adminAuth`.
- Produces:
  - `GET /campaigns`
  - `GET /campaigns/:id`
  - `GET /campaigns/:id/logs`
  - `POST /campaigns/:id/pause`
  - `POST /campaigns/:id/resume`
  - `POST /campaigns/:id/cancel`
  - `POST /campaigns/:id/retry-failed`
  - Refactored `POST /email-templates/:key/send-blast`

- [ ] **Step 1: Create `backend/src/routes/campaigns.ts`**

```ts
import { Router, Request, Response } from 'express';
import { adminAuth } from '@/middleware/adminAuth';
import { campaignService } from '@/services/campaignService';
import { campaignWorker } from '@/services/campaignWorker';

const router = Router();
router.use(adminAuth);

// List campaigns
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, limit, estado } = req.query;
    const result = await campaignService.getCampaigns({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      estado: estado as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign details
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const campaign = await campaignService.getCampaignById(id);
    if (!campaign) {
      return res.status(404).json({ error: 'Campaña no encontrada' });
    }
    res.json(campaign);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign recipient logs
router.get('/:id/logs', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { page, limit, estado } = req.query;
    const result = await campaignService.getCampaignLogs(id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      estado: estado as string,
    });
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Pause
router.post('/:id/pause', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await campaignWorker.pauseCampaign(id);
    res.json({ message: 'Campaña pausada con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Resume
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await campaignWorker.resumeCampaign(id);
    res.json({ message: 'Campaña reanudada con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cancel
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await campaignWorker.cancelCampaign(id);
    res.json({ message: 'Campaña cancelada con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Retry failed
router.post('/:id/retry-failed', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await campaignWorker.retryFailed(id);
    res.json({ message: 'Reintento de fallidos iniciado con éxito' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

- [ ] **Step 2: Update `backend/src/routes/emailTemplates.ts`**

Replace the in-memory `/send-blast` implementation with the persistent queue workflow:
```ts
import { campaignService } from '../services/campaignService';
import { campaignWorker } from '../services/campaignWorker';

// Enviar blast masivo (ahora persistido y encolado)
router.post('/:key/send-blast', async (req: Request, res: Response) => {
  try {
    const { key } = req.params;
    const { audiences, provinces, manualList, nombreCampania } = req.body;

    const template = await emailTemplateService.getTemplate(key);
    const defaultTpl = getDefaultTemplate(key);
    const subject = template?.subject || defaultTpl?.subject || 'Novedades de Fernet Los Horneros';

    if ((!audiences || audiences.length === 0) && !manualList) {
      return res.status(400).json({ error: 'Debes seleccionar al menos una audiencia o ingresar una lista manual.' });
    }

    const finalRecipients = await audiencesService.getRecipients({
      audiences,
      provinces,
      manualList,
      buyerLoteId: req.body.buyerLoteId,
      buyerStatuses: req.body.buyerStatuses,
    });

    if (finalRecipients.length === 0) {
      return res.status(400).json({ error: 'No hay destinatarios que coincidan con los filtros o la lista provista.' });
    }

    const campaignTitle = nombreCampania && nombreCampania.trim()
      ? nombreCampania.trim()
      : `Envío ${key} - ${new Date().toLocaleDateString('es-AR')}`;

    // Create campaign and persist all recipients in MySQL
    const campaign = await campaignService.createCampaignWithRecipients({
      nombre: campaignTitle,
      template_key: key,
      asunto: subject,
      recipients: finalRecipients,
      creado_por: (req as any).user?.email || 'admin',
    });

    // Start background worker
    campaignWorker.startCampaignWorker(campaign.id);

    res.json({
      message: 'Campaña creada y encolada con éxito.',
      campaignId: campaign.id,
      total: campaign.total_destinatarios,
    });
  } catch (error: any) {
    console.error('Error initiating email blast:', error);
    res.status(500).json({ error: error.message });
  }
});
```

- [ ] **Step 3: Register `campaignsRouter` in `backend/src/index.ts`**

Import and add `campaignsRouter`:
```ts
import campaignsRouter from '@/routes/campaigns';
// ...
app.use('/campaigns', campaignsRouter);
```

- [ ] **Step 4: Verify backend typecheck**

Run: `pnpm --filter backend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 5: Commit changes**

```bash
git add backend/src/routes/campaigns.ts backend/src/routes/emailTemplates.ts backend/src/index.ts
git commit -m "feat(backend): add /campaigns endpoints and connect /send-blast to persistent campaign queue"
```

---

### Task 5: Frontend API Client & SendBlastModal Enhancements

**Files:**
- Create: `frontend/lib/campaigns-api.ts`
- Modify: `frontend/app/admin/emails/components/SendBlastModal.tsx`

**Interfaces:**
- Consumes: `API_BASE_URL` from `@/lib/api`.
- Produces: API methods and updated `SendBlastModal` with Campaign Name input and `onCampaignCreated(campaignId: number)` callback.

- [ ] **Step 1: Create `frontend/lib/campaigns-api.ts`**

```ts
import { API_BASE_URL } from '@/lib/api';

export interface Campaign {
  id: number;
  nombre: string;
  template_key: string;
  asunto: string;
  estado: 'en_cola' | 'procesando' | 'pausada' | 'completada' | 'cancelada';
  total_destinatarios: number;
  enviados_count: number;
  fallidos_count: number;
  creado_por: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignRecipientLog {
  id: number;
  campania_id: number;
  email: string;
  nombre: string | null;
  estado: 'pendiente' | 'enviando' | 'enviado' | 'fallido';
  error_mensaje: string | null;
  intentos: number;
  enviado_at: string | null;
  created_at: string;
}

const getHeaders = () => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export const campaignsApi = {
  async getCampaigns(page: number = 1, limit: number = 20): Promise<{ campaigns: Campaign[]; total: number }> {
    const res = await fetch(`${API_BASE_URL}/campaigns?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener campañas');
    return res.json();
  },

  async getCampaignById(id: number): Promise<Campaign> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener detalle de campaña');
    return res.json();
  },

  async getCampaignLogs(id: number, page: number = 1, limit: number = 50): Promise<{ logs: CampaignRecipientLog[]; total: number }> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/logs?page=${page}&limit=${limit}`, {
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al obtener logs de campaña');
    return res.json();
  },

  async pauseCampaign(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/pause`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al pausar campaña');
  },

  async resumeCampaign(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/resume`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al reanudar campaña');
  },

  async cancelCampaign(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/cancel`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al cancelar campaña');
  },

  async retryFailed(id: number): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/campaigns/${id}/retry-failed`, {
      method: 'POST',
      headers: getHeaders(),
    });
    if (!res.ok) throw new Error('Error al reintentar envíos fallidos');
  },
};
```

- [ ] **Step 2: Update `SendBlastModal.tsx`**

Add `campaignName` state and input field:
- Add prop `onCampaignCreated?: (campaignId: number) => void`.
- In `executeSend`, send `nombreCampania: campaignName`.
- On response, call `onCampaignCreated(data.campaignId)`.

- [ ] **Step 3: Verify frontend typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit changes**

```bash
git add frontend/lib/campaigns-api.ts frontend/app/admin/emails/components/SendBlastModal.tsx
git commit -m "feat(frontend): create campaignsApi service and add campaign naming in SendBlastModal"
```

---

### Task 6: Frontend Live Monitoring & Logs Console Component

**Files:**
- Create: `frontend/app/admin/emails/components/CampaignMonitorModal.tsx`

**Interfaces:**
- Consumes: `campaignsApi` from `@/lib/campaigns-api`.
- Produces: Interactive modal/drawer with:
  - Progress bar.
  - KPI counters.
  - Buttons: Pausar, Reanudar, Cancelar, Reintentar Fallidos.
  - Live logs terminal with auto-scroll and status indicators.

- [ ] **Step 1: Implement `CampaignMonitorModal.tsx`**

```tsx
"use client"

import React, { useState, useEffect, useRef } from "react"
import { campaignsApi, Campaign, CampaignRecipientLog } from "@/lib/campaigns-api"
import { Button } from "@/components/ui/button"
import { 
  Play, Pause, XCircle, RefreshCw, CheckCircle2, 
  AlertTriangle, Clock, Send, ShieldAlert, ArrowDown 
} from "lucide-react"

interface CampaignMonitorModalProps {
  campaignId: number
  onClose: () => void
}

export function CampaignMonitorModal({ campaignId, onClose }: CampaignMonitorModalProps) {
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [logs, setLogs] = useState<CampaignRecipientLog[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [autoScroll, setAutoScroll] = useState(true)
  const logsContainerRef = useRef<HTMLDivElement>(null)

  const fetchStatus = async () => {
    try {
      const data = await campaignsApi.getCampaignById(campaignId)
      setCampaign(data)
      const logsData = await campaignsApi.getCampaignLogs(campaignId, 1, 60)
      setLogs(logsData.logs)
    } catch (e) {
      console.error("Error fetching campaign monitor data", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStatus()
    const interval = setInterval(() => {
      fetchStatus()
    }, 2500)
    return () => clearInterval(interval)
  }, [campaignId])

  useEffect(() => {
    if (autoScroll && logsContainerRef.current) {
      logsContainerRef.current.scrollTop = 0
    }
  }, [logs, autoScroll])

  const handlePause = async () => {
    setActionLoading(true)
    try {
      await campaignsApi.pauseCampaign(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  const handleResume = async () => {
    setActionLoading(true)
    try {
      await campaignsApi.resumeCampaign(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm("¿Seguro que deseas cancelar los envíos pendientes restantes?")) return
    setActionLoading(true)
    try {
      await campaignsApi.cancelCampaign(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  const handleRetryFailed = async () => {
    setActionLoading(true)
    try {
      await campaignsApi.retryFailed(campaignId)
      await fetchStatus()
    } finally {
      setActionLoading(false)
    }
  }

  if (loading && !campaign) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
        <div className="bg-[#14120f] border border-white/10 rounded-xl p-8 text-white flex items-center gap-3">
          <RefreshCw className="w-5 h-5 animate-spin text-[#AA6F3B]" />
          <span>Cargando monitor de campaña...</span>
        </div>
      </div>
    )
  }

  const total = campaign?.total_destinatarios || 0
  const enviados = campaign?.enviados_count || 0
  const fallidos = campaign?.fallidos_count || 0
  const pendientes = Math.max(0, total - enviados - fallidos)
  const percent = total > 0 ? Math.min(100, Math.round(((enviados + fallidos) / total) * 100)) : 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#14120f] border border-white/10 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#0b0a07]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-0.5 rounded uppercase font-semibold tracking-wider bg-[#AA6F3B]/20 text-[#AA6F3B] border border-[#AA6F3B]/30">
                {campaign?.estado}
              </span>
              <h2 className="text-lg font-bold text-white">{campaign?.nombre}</h2>
            </div>
            <p className="text-xs text-white/50 mt-1">Asunto: {campaign?.asunto}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-white/60 hover:text-white">
            ✕
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-white/70">
              <span>Progreso general</span>
              <span className="font-semibold text-white">{percent}% ({enviados + fallidos} de {total})</span>
            </div>
            <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-[#AA6F3B] to-[#dfa84a] transition-all duration-500" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          {/* Metric KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
              <span className="text-xs text-white/50 block">Total</span>
              <span className="text-xl font-bold text-white">{total}</span>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-green-400 block">Enviados</span>
              <span className="text-xl font-bold text-green-400">{enviados}</span>
            </div>
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-yellow-400 block">Pendientes</span>
              <span className="text-xl font-bold text-yellow-400">{pendientes}</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <span className="text-xs text-red-400 block">Fallidos</span>
              <span className="text-xl font-bold text-red-400">{fallidos}</span>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#0b0a07] p-3 rounded-lg border border-white/5">
            <div className="flex items-center gap-2">
              {campaign?.estado === 'procesando' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handlePause} 
                  disabled={actionLoading}
                  className="border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10"
                >
                  <Pause className="w-4 h-4 mr-1.5" /> Pausar
                </Button>
              )}
              {campaign?.estado === 'pausada' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleResume} 
                  disabled={actionLoading}
                  className="border-green-500/30 text-green-400 hover:bg-green-500/10"
                >
                  <Play className="w-4 h-4 mr-1.5" /> Reanudar
                </Button>
              )}
              {['en_cola', 'procesando', 'pausada'].includes(campaign?.estado || '') && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCancel} 
                  disabled={actionLoading}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <XCircle className="w-4 h-4 mr-1.5" /> Cancelar Restantes
                </Button>
              )}
              {fallidos > 0 && (
                <Button 
                  size="sm" 
                  onClick={handleRetryFailed} 
                  disabled={actionLoading}
                  className="bg-[#AA6F3B] hover:bg-[#AA6F3B]/90 text-white"
                >
                  <RefreshCw className="w-4 h-4 mr-1.5" /> Reintentar {fallidos} Fallidos
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-white/50">
              <RefreshCw className={`w-3.5 h-3.5 ${campaign?.estado === 'procesando' ? 'animate-spin text-[#AA6F3B]' : ''}`} />
              <span>Actualización en vivo cada 2.5s</span>
            </div>
          </div>

          {/* Live Logs Console */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-xs uppercase tracking-wider font-semibold text-white/60">
                Logs de Envíos en Vivo (Últimos 60)
              </h3>
              <label className="flex items-center gap-1.5 text-xs text-white/50 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={autoScroll} 
                  onChange={(e) => setAutoScroll(e.target.checked)} 
                  className="rounded border-white/20 bg-black/40 text-[#AA6F3B]"
                />
                Auto-scroll arriba
              </label>
            </div>

            <div 
              ref={logsContainerRef}
              className="bg-black/60 border border-white/10 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-xs space-y-1.5 custom-scrollbar"
            >
              {logs.length === 0 ? (
                <div className="text-white/30 text-center py-6">Esperando primeros envíos de la cola...</div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-none">
                    <div className="flex items-center gap-2 truncate pr-2">
                      <span className="text-white/40 text-[10px]">
                        {log.enviado_at ? new Date(log.enviado_at).toLocaleTimeString() : new Date(log.created_at).toLocaleTimeString()}
                      </span>
                      <span className="text-white/90 truncate">{log.email}</span>
                      {log.nombre && <span className="text-white/40 text-[11px]">({log.nombre})</span>}
                    </div>

                    <div className="flex-shrink-0">
                      {log.estado === 'enviado' && (
                        <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 border border-green-500/20 text-[10px]">
                          ✓ Enviado
                        </span>
                      )}
                      {log.estado === 'pendiente' && (
                        <span className="px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 text-[10px]">
                          En cola
                        </span>
                      )}
                      {log.estado === 'enviando' && (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] animate-pulse">
                          Enviando...
                        </span>
                      )}
                      {log.estado === 'fallido' && (
                        <span 
                          title={log.error_mensaje || 'Error'} 
                          className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] cursor-help"
                        >
                          ✕ Error
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-[#0b0a07] flex justify-end">
          <Button variant="outline" onClick={onClose} className="border-white/10 text-white hover:bg-white/10">
            Cerrar Monitor
          </Button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify frontend typecheck**

Run: `pnpm --filter frontend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 3: Commit changes**

```bash
git add frontend/app/admin/emails/components/CampaignMonitorModal.tsx
git commit -m "feat(frontend): implement CampaignMonitorModal with live progress, KPI cards and log feed"
```

---

### Task 7: Frontend Campaigns History Tab & Integration in `/admin/emails`

**Files:**
- Create: `frontend/app/admin/emails/components/CampaignsList.tsx`
- Modify: `frontend/app/admin/emails/page.tsx:1-50,200-250`

**Interfaces:**
- Consumes: `campaignsApi`, `CampaignMonitorModal`, `SendBlastModal`.
- Produces: Integrated tabs in `/admin/emails` with campaign historical table and direct access to live monitoring.

- [ ] **Step 1: Implement `CampaignsList.tsx`**

```tsx
"use client"

import React, { useState, useEffect } from "react"
import { campaignsApi, Campaign } from "@/lib/campaigns-api"
import { Button } from "@/components/ui/button"
import { Eye, RefreshCw, Send, AlertTriangle, CheckCircle2, Clock } from "lucide-react"

interface CampaignsListProps {
  onSelectCampaign: (id: number) => void
}

export function CampaignsList({ onSelectCampaign }: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await campaignsApi.getCampaigns(1, 50)
      setCampaigns(data.campaigns)
    } catch (e) {
      console.error("Error loading campaigns", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const getStatusBadge = (estado: Campaign['estado']) => {
    switch (estado) {
      case 'procesando':
        return <span className="px-2 py-0.5 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20">En curso</span>
      case 'completada':
        return <span className="px-2 py-0.5 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">Completada</span>
      case 'pausada':
        return <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Pausada</span>
      case 'cancelada':
        return <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-400 border border-red-500/20">Cancelada</span>
      default:
        return <span className="px-2 py-0.5 rounded text-xs bg-white/10 text-white/60">En cola</span>
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold text-white">Historial de Campañas</h2>
          <p className="text-xs text-white/50">Registro completo de todos los envíos masivos y su estado</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} className="border-white/10 text-white hover:bg-white/10">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <div className="bg-[#14120f] border border-white/10 rounded-xl overflow-hidden">
        {loading && campaigns.length === 0 ? (
          <div className="p-8 text-center text-white/40">Cargando campañas...</div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center text-white/40">No hay campañas registradas todavía.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-[#0b0a07] text-white/50 text-xs">
                  <th className="p-4">Campaña</th>
                  <th className="p-4">Plantilla / Asunto</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Progreso</th>
                  <th className="p-4">Fecha</th>
                  <th className="p-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {campaigns.map((c) => {
                  const sent = c.enviados_count || 0
                  const failed = c.fallidos_count || 0
                  const total = c.total_destinatarios || 0
                  const percent = total > 0 ? Math.round(((sent + failed) / total) * 100) : 0

                  return (
                    <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 font-medium text-white">
                        <div>#{c.id} {c.nombre}</div>
                        <div className="text-xs text-white/40">{c.creado_por}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-white/80">{c.asunto}</div>
                        <div className="text-xs text-[#AA6F3B]">{c.template_key}</div>
                      </td>
                      <td className="p-4">{getStatusBadge(c.estado)}</td>
                      <td className="p-4">
                        <div className="text-xs text-white/70 mb-1">
                          {sent} / {total} {failed > 0 && <span className="text-red-400">({failed} fallidos)</span>}
                        </div>
                        <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-[#AA6F3B]" style={{ width: `${percent}%` }} />
                        </div>
                      </td>
                      <td className="p-4 text-xs text-white/50">
                        {new Date(c.created_at).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectCampaign(c.id)}
                          className="border-white/10 text-white hover:bg-white/10 hover:border-[#AA6F3B]/50"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          Monitoreo
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `frontend/app/admin/emails/page.tsx`**

Integrate tab switching ("Plantillas" vs "Campañas") and modal handlers:
- Add `activeTab` state (`'templates' | 'campaigns'`).
- Add `monitoredCampaignId` state (`number | null`).
- Connect `SendBlastModal`'s `onCampaignCreated={(id) => { setActiveTab('campaigns'); setMonitoredCampaignId(id); }}`.
- Render `CampaignMonitorModal` whenever `monitoredCampaignId !== null`.

- [ ] **Step 3: Verify frontend typecheck and builds**

Run: `pnpm --filter frontend typecheck`
Expected: PASS with 0 errors.

- [ ] **Step 4: Commit changes**

```bash
git add frontend/app/admin/emails/components/CampaignsList.tsx frontend/app/admin/emails/page.tsx
git commit -m "feat(frontend): integrate campaigns list tab and live monitor modal in emails page"
```

---

### Task 8: End-to-End Verification & Verification Gate

**Files:**
- Full project verification

- [ ] **Step 1: Run backend tests**

Run: `pnpm --filter backend test`
Expected: All tests pass.

- [ ] **Step 2: Run frontend and backend builds**

Run: `pnpm --filter backend build && pnpm --filter frontend build`
Expected: Both builds succeed without errors.

- [ ] **Step 3: Verification commit**

```bash
git commit --allow-empty -m "test(verify): complete end-to-end verification of persistent email queue and live monitor"
```
