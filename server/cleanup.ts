import { Router } from 'express';
import { db } from './db';
import { items } from '@shared/schema';
import { lt } from 'drizzle-orm';

const router = Router();

router.get('/cleanup', async (_req, res) => {
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    await db.delete(items).where(lt(items.createdAt, fifteenDaysAgo));

    res.status(200).send('Old items deleted successfully.');
  } catch (err) {
    console.error('Cleanup error:', err);
    res.status(500).send('Error during cleanup.');
  }
});

export default router;