const { getSupabase } = require('./_supabase');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const diagnostics = {
    supabaseUrlSet: Boolean(process.env.SUPABASE_URL),
    supabaseUrlPrefix: process.env.SUPABASE_URL ? process.env.SUPABASE_URL.slice(0, 15) + '...' : null,
    supabaseKeySet: Boolean(process.env.SUPABASE_ANON_KEY),
    votingStatusTable: 'unknown',
    votesTable: 'unknown',
    status: 'checking',
    instructions: []
  };

  if (!diagnostics.supabaseUrlSet || !diagnostics.supabaseKeySet) {
    diagnostics.status = 'MISSING_ENV_VARS';
    diagnostics.instructions.push(
      'Configura SUPABASE_URL e SUPABASE_ANON_KEY nelle impostazioni di Vercel (Settings -> Environment Variables) e assicurati di spuntare Production.',
      'IMPORTANTE: Dopo aver salvato le variabili su Vercel, devi effettuare un REDEPLOY per renderle attive.'
    );
    return res.status(500).json(diagnostics);
  }

  try {
    const supabase = getSupabase();

    // Test voting_status
    const { data: statusRows, error: statusError } = await supabase
      .from('voting_status')
      .select('*')
      .limit(5);

    if (statusError) {
      diagnostics.votingStatusTable = `ERROR: ${statusError.message}`;
      diagnostics.instructions.push(
        'Tabella voting_status non accessibile o inesistente. Esegui lo script SQL da supabase-schema.sql nel SQL Editor di Supabase.'
      );
    } else {
      diagnostics.votingStatusTable = `OK (${statusRows ? statusRows.length : 0} righe trovate)`;
      if (statusRows.length === 0) {
        // Auto-fix: inserisci riga iniziale
        await supabase.from('voting_status').insert([{ id: 1, voting_open: true }]);
        diagnostics.votingStatusTable += ' -> Inserita riga iniziale automaticamente!';
      }
    }

    // Test votes
    const { data: votesRows, error: votesError } = await supabase
      .from('votes')
      .select('id')
      .limit(5);

    if (votesError) {
      diagnostics.votesTable = `ERROR: ${votesError.message}`;
      diagnostics.instructions.push(
        'Tabella votes non accessibile o inesistente. Esegui lo script SQL da supabase-schema.sql nel SQL Editor di Supabase.'
      );
    } else {
      diagnostics.votesTable = `OK (${votesRows ? votesRows.length : 0} voti registrati)`;
    }

    if (statusError || votesError) {
      diagnostics.status = 'DATABASE_TABLE_ERROR';
      return res.status(500).json(diagnostics);
    }

    diagnostics.status = 'ALL_SYSTEMS_OPERATIONAL';
    diagnostics.message = 'Connessione a Supabase riuscita al 100%! Tabelle configurate e pronte.';
    return res.status(200).json(diagnostics);
  } catch (err) {
    diagnostics.status = 'CONNECTION_EXCEPTION';
    diagnostics.error = err.message;
    return res.status(500).json(diagnostics);
  }
};
