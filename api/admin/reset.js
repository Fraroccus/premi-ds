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
    return res.status(500).json({ error: 'Variabili Supabase mancanti su Vercel.' });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      return res.status(500).json({ error: `Errore reset voti: ${deleteError.message}` });
    }

    const { data: statusRows, error: fetchError } = await supabase
      .from('voting_status')
      .select('id')
      .limit(1);

    if (!fetchError && statusRows && statusRows.length > 0) {
      await supabase
        .from('voting_status')
        .update({
          voting_open: true,
          updated_at: new Date().toISOString()
        })
        .neq('id', 0);
    } else {
      await supabase
        .from('voting_status')
        .insert([{ id: 1, voting_open: true }]);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore reset' });
  }
};
