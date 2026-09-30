const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    try {
      // Ottieni stato votazioni
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      // Conta votanti
      const { count, error: countError } = await supabase
        .from('votes')
        .select('nickname', { count: 'exact', head: true });

      if (countError) throw countError;

      res.status(200).json({
        votingOpen: statusData ? statusData.voting_open : true,
        totalVoters: count || 0
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
