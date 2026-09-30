import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variabili Supabase mancanti su Vercel.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verifica stato votazioni
    const { data: statusRows, error: statusError } = await supabase
      .from('voting_status')
      .select('voting_open')
      .order('id', { ascending: true })
      .limit(1);

    if (statusError) {
      return res.status(500).json({ error: `Errore database: ${statusError.message}` });
    }

    const votingOpen = statusRows && statusRows.length > 0 ? statusRows[0].voting_open : true;
    const isAdmin = req.query && (req.query.admin === 'true' || req.query.admin === '1');

    if (votingOpen && !isAdmin) {
      return res.status(403).json({ error: 'Le votazioni sono ancora aperte. Chiudile per vedere i risultati.' });
    }

    // Carica configurazione
    const configPath = path.join(process.cwd(), 'config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

    // Ottieni tutti i voti
    const { data: votesData, error: votesError } = await supabase
      .from('votes')
      .select('votes');

    if (votesError) {
      return res.status(500).json({ error: `Errore recupero voti: ${votesError.message}` });
    }

    // Calcola risultati
    const results = calculateResults(config.categories, votesData || []);
    return res.status(200).json(results);
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore calcolo risultati' });
  }
}

function calculateResults(categories, votesData) {
  const results = {};

  categories.forEach(category => {
    const categoryId = category.id;
    const scores = {};

    category.nominations.forEach(nom => {
      scores[nom.id] = 0;
    });

    votesData.forEach(voteRecord => {
      const categoryVote = voteRecord.votes ? voteRecord.votes[categoryId] : null;
      if (categoryVote) {
        if (categoryVote.first && scores[categoryVote.first] !== undefined) scores[categoryVote.first] += 4;
        if (categoryVote.second && scores[categoryVote.second] !== undefined) scores[categoryVote.second] += 2;
        if (categoryVote.third && scores[categoryVote.third] !== undefined) scores[categoryVote.third] += 1;
      }
    });

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
