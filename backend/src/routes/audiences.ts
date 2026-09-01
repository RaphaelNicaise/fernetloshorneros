import { Router } from 'express';
import { adminAuth } from '@/middleware/adminAuth';
import { countAudience, getAudienceProvinces } from '@/controllers/audiencesController';

const router = Router();
router.use(adminAuth);

router.post('/count', countAudience);
router.get('/provinces', getAudienceProvinces);

export default router;
