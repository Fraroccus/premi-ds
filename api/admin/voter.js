import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Variabili Supabase mancanti su Vercel.' });
  }

  const nickname = (req.query.nickname || (req.body && req.body.nickname) || '').toString().trim();
  if (!nickname) {
    return res.status(400).json({ error: 'Nickname mancante' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // GET: Dettaglio voti singolo votante
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('votes')
        .select('id, nickname, votes, created_at')
        .ilike('nickname', nickname)
        .order('id', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return res.status(500).json({ error: `Errore database: ${error.message}` });
      }

      if (!data) {
        return res.status(404).json({ error: `Nessun voto trovato per il nickname "${nickname}"` });
      }

      return res.status(200).json({ success: true, voter: data });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Errore recupero scheda voto' });
    }
  }

  // DELETE o POST con action=delete
  if (req.method === 'DELETE' || req.method === 'POST') {
    try {
      const { data, error } = await supabase
        .from('votes')
        .delete()
        .ilike('nickname', nickname)
        .select();

      if (error) {
        return res.status(500).json({ error: `Errore eliminazione voto: ${error.message}` });
      }

      return res.status(200).json({
        success: true,
        message: `Voto di ${nickname} eliminato con successo`,
        deletedCount: data ? data.length : 1
      });
    } catch (err) {
      return res.status(500).json({ error: err.message || 'Errore eliminazione voto' });
    }
  }

  return res.status(405).json({ error: 'Metodo non consentito' });
}
