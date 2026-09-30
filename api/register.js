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
      const { nickname } = req.body || {};

      if (!nickname || nickname.trim() === '') {
        return res.status(400).json({ error: 'Nickname non valido' });
      }

      // Verifica stato votazioni
      const { data: statusData, error: statusError } = await supabase
        .from('voting_status')
        .select('voting_open')
        .order('id', { ascending: true })
        .limit(1)
        .single();

      if (statusError) throw statusError;

      if (statusData && !statusData.voting_open) {
        return res.status(403).json({ error: 'Le votazioni sono chiuse' });
      }

      // Verifica se nickname già votato (case-insensitive)
      const { data: existingVotes, error: checkError } = await supabase
        .from('votes')
        .select('nickname')
        .ilike('nickname', nickname.trim());

      if (checkError) throw checkError;

      if (existingVotes && existingVotes.length > 0) {
        return res.status(400).json({ error: 'Hai già votato' });
      }

      res.status(200).json({ success: true, nickname: nickname.trim() });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
