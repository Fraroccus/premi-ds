const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
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
    return res.status(500).json({
      error: 'Variabili Supabase mancanti su Vercel. Inseriscile e fai Redeploy.'
    });
  }

  try {
    const { nickname } = req.body || {};

    if (!nickname || typeof nickname !== 'string' || nickname.trim() === '') {
      return res.status(400).json({ error: 'Inserisci un nickname valido' });
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
      return res.status(400).json({ error: 'Hai già inviato la tua votazione con questo nickname' });
    }

    return res.status(200).json({ success: true, nickname: cleanNickname });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore durante la registrazione' });
  }
};
