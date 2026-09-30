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

    // Elimina tutti i voti
    const { error: deleteError } = await supabase
      .from('votes')
      .delete()
      .neq('id', 0);

    if (deleteError) {
      console.error('Errore delete votes:', deleteError);
      return res.status(500).json({ 
        error: `Errore reset voti: ${deleteError.message}. Controlla la policy DELETE su tabella votes in Supabase.` 
      });
    }

    // Reset o inserimento voting_status
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
    console.error('Reset handler error:', error);
    return res.status(500).json({ error: error.message || 'Errore reset' });
  }
};
