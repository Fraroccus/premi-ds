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

    const { data: statusRows, error: fetchError } = await supabase
      .from('voting_status')
      .select('id, voting_open')
      .order('id', { ascending: true })
      .limit(1);

    if (fetchError) {
      return res.status(500).json({ error: `Errore database: ${fetchError.message}` });
    }

    if (!statusRows || statusRows.length === 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('voting_status')
        .insert([{ id: 1, voting_open: false, updated_at: new Date().toISOString() }])
        .select()
        .single();

      if (insertError) throw insertError;
      return res.status(200).json({ votingOpen: inserted.voting_open });
    }

    const currentStatus = statusRows[0];
    const newStatus = !currentStatus.voting_open;

    const { data, error: updateError } = await supabase
      .from('voting_status')
      .update({
        voting_open: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', currentStatus.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: `Errore modifica stato: ${updateError.message}` });
    }

    return res.status(200).json({ votingOpen: data.voting_open });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Errore operazione' });
  }
};
