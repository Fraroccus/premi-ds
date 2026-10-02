import { createClient } from '@supabase/supabase-js';

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

    const { data, error } = await supabase
      .from('votes')
      .select('nickname');

    if (error) {
      return res.status(500).json({ error: `Errore recupero votanti: ${error.message}` });
    }

    const voters = (data || []).map((row) => row.nickname).filter(Boolean);
    const uniqueVoters = Array.from(new Set(voters)).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    return res.status(200).json({ voters: uniqueVoters, count: uniqueVoters.length });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore recupero votanti' });
  }
}
