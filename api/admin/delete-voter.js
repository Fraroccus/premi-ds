import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variabili Supabase mancanti su Vercel.' });
  }

  const nickname = (req.body && req.body.nickname ? req.body.nickname : req.query.nickname || '').toString().trim();
  if (!nickname) {
    return res.status(400).json({ error: 'Nickname mancante' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('votes')
      .delete()
      .ilike('nickname', nickname)
      .select();

    if (error) {
      return res.status(500).json({ error: `Errore eliminazione: ${error.message}` });
    }

    return res.status(200).json({
      success: true,
      message: `Voto di ${nickname} eliminato con successo`,
      deletedCount: data ? data.length : 1
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore eliminazione' });
  }
}
