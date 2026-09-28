import { Request, Response } from 'express';
import { audiencesService, AudienceFilterOptions } from '@/services/audiencesService';

export async function countAudience(req: Request, res: Response) {
  try {
    const options = req.body as AudienceFilterOptions;
    const count = await audiencesService.countRecipients(options);
    res.json({ count });
  } catch (error: any) {
    console.error('Error counting audience:', error);
    res.status(500).json({ error: error.message });
  }
}

export async function getAudienceProvinces(req: Request, res: Response) {
  try {
    const provinces = await audiencesService.getProvinces();
    res.json(provinces);
  } catch (error: any) {
    console.error('Error fetching provinces:', error);
    res.status(500).json({ error: error.message });
  }
}
