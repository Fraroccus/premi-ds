import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
const HOST = '0.0.0.0';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'votes.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log(`Using Supabase database: ${supabaseUrl}`);
} else {
  console.log('Using local JSON storage (votes.json). To use Supabase, configure SUPABASE_URL and SUPABASE_ANON_KEY.');
}

interface VoteEntry {
  first?: string;
  second?: string;
  third?: string;
}

interface VoterRecord {
  nickname: string;
  votes: Record<string, VoteEntry>;
  timestamp?: string;
}

interface VotingData {
  votingOpen: boolean;
  voters: string[];
  votes: VoterRecord[];
}

interface Nomination {
  id: string;
  name: string;
  image: string;
}

interface Category {
  id: string;
  name: string;
  nominations: Nomination[];
}

interface Config {
  categories: Category[];
}

// Config loader
function getConfig(): Config {
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
}

// Local fallback data
let votingData: VotingData = {
  votingOpen: true,
  voters: [],
  votes: [],
};

if (fs.existsSync(DATA_FILE)) {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    votingData = JSON.parse(raw);
  } catch (error) {
    console.warn('Inizializzazione nuovi dati di votazione:', error);
  }
}

function saveLocalData(): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votingData, null, 2));
  } catch (err) {
    console.error('Errore nel salvataggio dei voti locali:', err);
  }
}

// API: Ottieni configurazione categorie
app.get('/api/config', (_req: Request, res: Response) => {
  try {
    const config = getConfig();
    res.json(config);
  } catch (error) {
    console.error('Errore lettura config:', error);
    res.status(500).json({ error: 'Errore nel caricamento della configurazione' });
  }
});

// API: Verifica stato votazioni
app.get('/api/status', async (_req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      const { count, error: countError } = await supabase
        .from('votes')
        .select('nickname', { count: 'exact', head: true });

      if (countError) throw countError;

      return res.json({
        votingOpen: statusData ? statusData.voting_open : true,
        totalVoters: count || 0,
      });
    } catch (err: any) {
      console.error('Errore stato Supabase:', err);
      return res.status(500).json({ error: err.message || 'Errore database' });
    }
  }

  // Fallback locale
  res.json({
    votingOpen: votingData.votingOpen,
    totalVoters: votingData.voters.length,
  });
});

// API: Registra nickname
app.post('/api/register', async (req: Request, res: Response) => {
  const nickname = req.body?.nickname?.toString().trim();

  if (!nickname) {
    return res.status(400).json({ error: 'Nickname non valido' });
  }

  if (supabase) {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      if (statusData && !statusData.voting_open) {
        return res.status(403).json({ error: 'Le votazioni sono chiuse' });
      }

      const { data: existingVotes, error: checkError } = await supabase
        .from('votes')
        .select('nickname')
        .ilike('nickname', nickname);

      if (checkError) throw checkError;

      if (existingVotes && existingVotes.length > 0) {
        return res.status(400).json({ error: 'Hai già votato' });
      }

      return res.json({ success: true, nickname });
    } catch (err: any) {
      console.error('Errore register Supabase:', err);
      return res.status(500).json({ error: err.message || 'Errore database' });
    }
  }

  // Fallback locale
  if (!votingData.votingOpen) {
    return res.status(403).json({ error: 'Le votazioni sono chiuse' });
  }

  const alreadyRegistered = votingData.voters.some(
    (v) => v.toLowerCase() === nickname.toLowerCase()
  );
  if (alreadyRegistered) {
    return res.status(400).json({ error: 'Nickname già utilizzato' });
  }

  const hasVoted = votingData.votes.some(
    (vote) => vote.nickname.toLowerCase() === nickname.toLowerCase()
  );
  if (hasVoted) {
    return res.status(400).json({ error: 'Hai già votato' });
  }

  res.json({ success: true, nickname });
});

// API: Invia voto
app.post('/api/vote', async (req: Request, res: Response) => {
  const nickname = req.body?.nickname?.toString().trim();
  const votes = req.body?.votes;

  if (!nickname || !votes || typeof votes !== 'object') {
    return res.status(400).json({ error: 'Dati non validi' });
  }

  // Verifica che non ci siano voti duplicati per la stessa persona nella stessa categoria
  for (const [catId, catVotes] of Object.entries(votes as Record<string, any>)) {
    if (catVotes && typeof catVotes === 'object') {
      const { first, second, third } = catVotes;
      if (
        (first && second && first === second) ||
        (first && third && first === third) ||
        (second && third && second === third)
      ) {
        return res.status(400).json({
          error: 'Non è consentito votare la stessa persona per più posizioni nella stessa categoria',
        });
      }
    }
  }

  if (supabase) {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      if (statusData && !statusData.voting_open) {
        return res.status(403).json({ error: 'Le votazioni sono chiuse' });
      }

      const { data: existingVotes, error: checkError } = await supabase
        .from('votes')
        .select('nickname')
        .ilike('nickname', nickname);

      if (checkError) throw checkError;

      if (existingVotes && existingVotes.length > 0) {
        return res.status(400).json({ error: 'Hai già votato' });
      }

      const { error: insertError } = await supabase
        .from('votes')
        .insert([{ nickname, votes }]);

      if (insertError) throw insertError;

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Errore invio voto Supabase:', err);
      return res.status(500).json({ error: err.message || 'Errore salvataggio voto' });
    }
  }

  // Fallback locale
  if (!votingData.votingOpen) {
    return res.status(403).json({ error: 'Le votazioni sono chiuse' });
  }

  const hasVoted = votingData.votes.some(
    (vote) => vote.nickname.toLowerCase() === nickname.toLowerCase()
  );
  if (hasVoted) {
    return res.status(400).json({ error: 'Hai già votato' });
  }

  if (!votingData.voters.includes(nickname)) {
    votingData.voters.push(nickname);
  }

  votingData.votes.push({
    nickname,
    votes,
    timestamp: new Date().toISOString(),
  });

  saveLocalData();
  res.json({ success: true });
});

// Calcolo risultati
function calculateResults(categories: Category[], votes: Array<{ votes: Record<string, VoteEntry> }>) {
  const results: Record<string, { categoryName: string; ranking: Array<Nomination & { score: number }> }> = {};

  categories.forEach((category) => {
    const categoryId = category.id;
    const scores: Record<string, number> = {};

    category.nominations.forEach((nom) => {
      scores[nom.id] = 0;
    });

    votes.forEach((voteRecord) => {
      const categoryVote = voteRecord.votes ? voteRecord.votes[categoryId] : null;
      if (categoryVote) {
        if (categoryVote.first && scores[categoryVote.first] !== undefined) scores[categoryVote.first] += 4;
        if (categoryVote.second && scores[categoryVote.second] !== undefined) scores[categoryVote.second] += 2;
        if (categoryVote.third && scores[categoryVote.third] !== undefined) scores[categoryVote.third] += 1;
      }
    });

    const ranking = Object.entries(scores)
      .map(([nominationId, score]) => {
        const nomination = category.nominations.find((n) => n.id === nominationId) || {
          id: nominationId,
          name: nominationId,
          image: '',
        };
        return {
          id: nominationId,
          name: nomination.name,
          image: nomination.image,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    results[categoryId] = {
      categoryName: category.name,
      ranking,
    };
  });

  return results;
}

// API: Ottieni risultati
app.get('/api/results', async (req: Request, res: Response) => {
  const isAdmin = req.query.admin === 'true' || req.query.admin === '1';

  if (supabase) {
    try {
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      if (statusData && statusData.voting_open && !isAdmin) {
        return res.status(403).json({ error: 'Le votazioni sono ancora aperte' });
      }

      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('votes');

      if (votesError) throw votesError;

      const config = getConfig();
      const results = calculateResults(config.categories, votesData || []);
      return res.json(results);
    } catch (err: any) {
      console.error('Errore risultati Supabase:', err);
      return res.status(500).json({ error: err.message || 'Errore calcolo risultati' });
    }
  }

  // Fallback locale
  if (votingData.votingOpen && !isAdmin) {
    return res.status(403).json({ error: 'Le votazioni sono ancora aperte' });
  }

  try {
    const config = getConfig();
    const results = calculateResults(config.categories, votingData.votes);
    res.json(results);
  } catch (error) {
    console.error('Errore nel calcolo dei risultati:', error);
    res.status(500).json({ error: 'Errore nel calcolo dei risultati' });
  }
});

// API Admin: Chiudi/Apri votazioni
app.post('/api/admin/toggle-voting', async (_req: Request, res: Response) => {
  if (supabase) {
    try {
      const { data: currentStatus, error: fetchError } = await supabase
        .from('voting_status')
        .select('id, voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      const nextStatus = !currentStatus.voting_open;
      const { data, error } = await supabase
        .from('voting_status')
        .update({
          voting_open: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentStatus.id)
        .select()
        .single();

      if (error) throw error;

      return res.json({ votingOpen: data.voting_open });
    } catch (err: any) {
      console.error('Errore toggle Supabase:', err);
      return res.status(500).json({ error: err.message || 'Errore toggle votazioni' });
    }
  }

  // Fallback locale
  votingData.votingOpen = !votingData.votingOpen;
  saveLocalData();
  res.json({ votingOpen: votingData.votingOpen });
});

// API Admin: Reset votazioni
app.post('/api/admin/reset', async (_req: Request, res: Response) => {
  if (supabase) {
    try {
      const { error: deleteError } = await supabase
        .from('votes')
        .delete()
        .neq('id', 0);

      if (deleteError) throw deleteError;

      const { error: updateError } = await supabase
        .from('voting_status')
        .update({
          voting_open: true,
          updated_at: new Date().toISOString(),
        })
        .neq('id', 0);

      if (updateError) throw updateError;

      return res.json({ success: true });
    } catch (err: any) {
      console.error('Errore reset Supabase:', err);
      return res.status(500).json({ error: err.message || 'Errore reset' });
    }
  }

  // Fallback locale
  votingData = {
    votingOpen: true,
    voters: [],
    votes: [],
  };
  saveLocalData();
  res.json({ success: true });
});

// SPA fallback
app.get('*', (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, HOST, () => {
  console.log(`Premi Bonobi running at http://${HOST}:${PORT}`);
});
