import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

router.get('/', (req, res) => {
  try {
    const filePath = path.join(__dirname, '../data/symbols.json');
    const data = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error reading symbols file:', error);
    res.status(500).json({ error: 'Error fetching symbols' });
  }
});

export default router;
