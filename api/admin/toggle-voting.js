const { getSupabase } = require('../_supabase');

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

  try {
    const supabase = getSupabase();

    // Ottieni stato attuale
    const { data: statusRows, error: fetchError } = await supabase
      .from('voting_status')
      .select('id, voting_open')
      .order('id', { ascending: true })
      .limit(1);

    if (fetchError) {
      console.error('Errore fetch voting_status:', fetchError);
      return res.status(500).json({ error: `Errore database: ${fetchError.message}` });
    }

    if (!statusRows || statusRows.length === 0) {
      // Inizializza se non presente
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
      console.error('Errore update voting_status:', updateError);
      return res.status(500).json({ 
        error: `Errore modifica stato: ${updateError.message}. Controlla la policy UPDATE su Supabase.` 
      });
    }

    return res.status(200).json({ votingOpen: data.voting_open });
  } catch (error) {
    console.error('Toggle voting handler error:', error);
    return res.status(500).json({ error: error.message || 'Errore operazione' });
  }
};
