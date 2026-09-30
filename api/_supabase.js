const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!key) missing.push('SUPABASE_ANON_KEY');
    
    throw new Error(
      `Variabili d'ambiente mancanti su Vercel: ${missing.join(', ')}. ` +
      `Aggiungile su Vercel (Project Settings -> Environment Variables, selezionando Production) e fai un REDEPLOY.`
    );
  }

  return createClient(url, key);
}

module.exports = { getSupabase };
