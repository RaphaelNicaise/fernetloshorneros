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
      const template = await emailTemplateService.getTemplate(campaign.template_key);
      let subject = template?.subject || campaign.asunto;
      let htmlContent = template?.html_content;

      if (!htmlContent) {
        const defaultTpl = getDefaultTemplate(campaign.template_key);
        subject = subject || defaultTpl?.subject || campaign.asunto;
        htmlContent = defaultTpl?.html || '<p>Fernet Los Horneros</p>';
      }

      const fromEmail = process.env.MAIL_FROM || process.env.SMTP_USER || process.env.MAIL_USER;
      const batchSize = 10;
      const pacingDelayMs = process.env.NODE_ENV === 'test' ? 0 : 200; // 5 emails/second max in prod

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

  /**
   * Helper strictly for resetting internal state between unit tests.
   */
  _resetStateForTesting(): void {
    activeCampaigns.clear();
    pausedCampaigns.clear();
    cancelledCampaigns.clear();
  },
};
