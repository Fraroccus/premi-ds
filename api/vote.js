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

  try {
    const { nickname, votes } = req.body || {};

    if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
      return res.status(400).json({ error: 'Nickname mancante' });
    }

    if (!votes || typeof votes !== 'object') {
      return res.status(400).json({ error: 'Dati votazione non validi' });
    }

    // Verifica che non ci siano voti duplicati per la stessa persona nella stessa categoria
    for (const catId of Object.keys(votes)) {
      const catVotes = votes[catId];
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

    const cleanNickname = nickname.trim();
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

    if (statusRows && statusRows.length > 0 && !statusRows[0].voting_open) {
      return res.status(403).json({ error: 'Le votazioni sono chiuse' });
    }

    // Verifica se nickname ha già votato
    const { data: existingVotes, error: checkError } = await supabase
      .from('votes')
      .select('nickname')
      .ilike('nickname', cleanNickname);

    if (checkError) {
      return res.status(500).json({ error: `Errore verifica voti: ${checkError.message}` });
    }

    if (existingVotes && existingVotes.length > 0) {
      return res.status(400).json({ error: 'Hai già inviato la tua votazione' });
    }

    // Inserisci voto
    const { error: insertError } = await supabase
      .from('votes')
      .insert([{ nickname: cleanNickname, votes }]);

    if (insertError) {
      return res.status(500).json({ error: `Errore salvataggio voto: ${insertError.message}` });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore invio voto' });
  }
}
