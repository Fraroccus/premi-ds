const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async function handler(req, res) {
  // Abilita CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Accept');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      // Ottieni stato attuale
      const { data: currentStatus, error: fetchError } = await supabase
        .from('voting_status')
        .select('id, voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;

      // Toggle stato
      const { data, error } = await supabase
        .from('voting_status')
        .update({ 
          voting_open: !currentStatus.voting_open,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentStatus.id)
        .select()
        .single();

      if (error) throw error;

      res.status(200).json({ votingOpen: data.voting_open });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
