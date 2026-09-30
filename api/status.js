const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
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
    return res.status(500).json({
      error: `Variabili mancanti su Vercel: SUPABASE_URL=${Boolean(supabaseUrl)}, SUPABASE_ANON_KEY=${Boolean(supabaseKey)}. Inseriscile su Vercel e fai REDEPLOY.`
    });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: statusRows, error: statusError } = await supabase
      .from('voting_status')
      .select('id, voting_open')
      .order('id', { ascending: true })
      .limit(1);

    if (statusError) {
      return res.status(500).json({ error: 'Errore tabella voting_status: ' + statusError.message });
    }

    let votingOpen = true;
    if (!statusRows || statusRows.length === 0) {
      await supabase.from('voting_status').insert([{ id: 1, voting_open: true }]);
    } else {
      votingOpen = Boolean(statusRows[0].voting_open);
    }

    const { count, error: countError } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      return res.status(500).json({ error: 'Errore tabella votes: ' + countError.message });
    }

    return res.status(200).json({
      votingOpen,
      totalVoters: count || 0
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore server' });
  }
};
