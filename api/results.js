const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async function handler(req, res) {
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
      // Verifica stato votazioni
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      const isAdmin = req.query && (req.query.admin === 'true' || req.query.admin === '1');
      if (statusData.voting_open && !isAdmin) {
        return res.status(403).json({ error: 'Le votazioni sono ancora aperte' });
      }

      // Carica config
      let config;
      try {
        config = require('../config.json');
      } catch {
        const configPath = path.join(process.cwd(), 'config.json');
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      }

      // Ottieni tutti i voti
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('votes');

      if (votesError) throw votesError;

      // Calcola risultati
      const results = calculateResults(config.categories, votesData || []);
      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};

function calculateResults(categories, votesData) {
  const results = {};

  categories.forEach(category => {
    const categoryId = category.id;
    const scores = {};

    // Inizializza i punteggi
    category.nominations.forEach(nom => {
      scores[nom.id] = 0;
    });

    // Calcola i punteggi
    votesData.forEach(voteRecord => {
      const categoryVote = voteRecord.votes ? voteRecord.votes[categoryId] : null;
      if (categoryVote) {
        if (categoryVote.first && scores[categoryVote.first] !== undefined) scores[categoryVote.first] += 4;
        if (categoryVote.second && scores[categoryVote.second] !== undefined) scores[categoryVote.second] += 2;
        if (categoryVote.third && scores[categoryVote.third] !== undefined) scores[categoryVote.third] += 1;
      }
    });

    // Crea classifica ordinata
    const ranking = Object.entries(scores)
      .map(([nominationId, score]) => {
        const nomination = category.nominations.find(n => n.id === nominationId) || {
          id: nominationId,
          name: nominationId,
          image: ''
        };
        return {
          id: nominationId,
          name: nomination.name,
          image: nomination.image,
          score
        };
      })
      .sort((a, b) => b.score - a.score);

    results[categoryId] = {
      categoryName: category.name,
      ranking
    };
  });

  return results;
}
