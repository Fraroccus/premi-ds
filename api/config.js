import path from 'path';
import fs from 'fs';

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return res.status(200).json(config);
  } catch (error) {
    return res.status(500).json({ error: 'Configurazione non trovata: ' + error.message });
  }
}
