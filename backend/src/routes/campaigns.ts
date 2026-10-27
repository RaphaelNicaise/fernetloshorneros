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
