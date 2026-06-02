import { Router } from 'express';
import { generateDramaVisual } from '../lib/aiImages.js';
import { aiGenerateDramaVisualsSchema } from '../lib/schemas.js';
import { requireAdmin } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';

export const aiRouter = Router();

aiRouter.use(requireAdmin);

aiRouter.post('/generate-drama-visuals', validateBody(aiGenerateDramaVisualsSchema), async (req, res) => {
  try {
    const dramaId = String(req.body.dramaId);
    const kind = req.body.kind as 'poster' | 'hero' | 'both';
    const tasks: Array<'poster' | 'hero'> = kind === 'both' ? ['poster', 'hero'] : [kind];

    const assets = [];
    for (const task of tasks) {
      const customPrompt =
        task === 'poster'
          ? String(req.body.posterPrompt || req.body.prompt || '')
          : String(req.body.heroPrompt || req.body.prompt || '');
      assets.push(await generateDramaVisual({ dramaId, kind: task, customPrompt }));
    }

    return res.json({
      assets: assets.map(({ kind: assetKind, url, filename, prompt }) => ({ kind: assetKind, url, filename, prompt })),
      drama: assets.at(-1)?.drama,
    });
  } catch (error) {
    return res.status(400).json({ message: error instanceof Error ? error.message : 'AI 生图失败' });
  }
});
