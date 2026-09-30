const path = require('path');
const fs = require('fs');

module.exports = function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      let config;
      try {
        config = require('../config.json');
      } catch {
        const configPath = path.join(process.cwd(), 'config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }
      res.status(200).json(config);
    } catch (error) {
      res.status(500).json({ error: 'Configurazione non trovata' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
