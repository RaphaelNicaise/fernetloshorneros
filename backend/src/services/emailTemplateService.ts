import sequelize from '../config/database';
import { QueryTypes } from 'sequelize';

export interface EmailTemplate {
  id: number;
  template_key: string;
  subject: string;
  html_content: string;
  updated_at: Date;
}

export const emailTemplateService = {
  async getAllTemplates(): Promise<EmailTemplate[]> {
    return sequelize.query(
      `SELECT * FROM email_templates ORDER BY updated_at DESC`,
      { type: QueryTypes.SELECT }
    );
  },

  async getTemplate(key: string): Promise<EmailTemplate | null> {
    const rows = await sequelize.query<EmailTemplate>(
      `SELECT * FROM email_templates WHERE template_key = ? LIMIT 1`,
      {
        replacements: [key],
        type: QueryTypes.SELECT,
      }
    );
    return rows.length > 0 ? rows[0] : null;
  },

  async upsertTemplate(key: string, subject: string, htmlContent: string): Promise<void> {
    await sequelize.query(
      `INSERT INTO email_templates (template_key, subject, html_content)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE subject = VALUES(subject), html_content = VALUES(html_content)`,
      {
        replacements: [key, subject, htmlContent],
        type: QueryTypes.INSERT, // Using INSERT for UPSERT is fine with Sequelize
      }
    );
  },

  async deleteTemplate(key: string): Promise<void> {
    await sequelize.query(
      `DELETE FROM email_templates WHERE template_key = ?`,
      {
        replacements: [key],
        type: QueryTypes.DELETE,
      }
    );
  }
};
