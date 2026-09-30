const { getSupabase } = require('./_supabase');

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

  try {
    const supabase = getSupabase();

    // Ottieni stato votazioni (senza forzare .single())
    const { data: statusRows, error: statusError } = await supabase
      .from('voting_status')
      .select('id, voting_open')
      .order('id', { ascending: true })
      .limit(1);

    if (statusError) {
      console.error('Errore voting_status:', statusError);
      return res.status(500).json({ 
        error: `Errore Supabase su voting_status: ${statusError.message}. Verifica di aver eseguito supabase-schema.sql.` 
      });
    }

    let votingOpen = true;
    if (!statusRows || statusRows.length === 0) {
      // Auto-inserimento riga iniziale se la tabella è vuota
      await supabase.from('voting_status').insert([{ id: 1, voting_open: true }]);
    } else {
      votingOpen = Boolean(statusRows[0].voting_open);
    }

    // Conta votanti
    const { count, error: countError } = await supabase
      .from('votes')
      .select('id', { count: 'exact', head: true });

    if (countError) {
      console.error('Errore conteggio voti:', countError);
      return res.status(500).json({ 
        error: `Errore Supabase su tabella votes: ${countError.message}. Verifica le policy RLS.` 
      });
    }

    return res.status(200).json({
      votingOpen,
      totalVoters: count || 0
    });
  } catch (error) {
    console.error('Status handler error:', error);
    return res.status(500).json({ error: error.message || 'Errore del server' });
  }
};
