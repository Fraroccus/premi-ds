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
      // Elimina tutti i voti
      const { error: deleteError } = await supabase
        .from('votes')
        .delete()
        .neq('id', 0); // Delete all

      if (deleteError) throw deleteError;

      // Reset stato votazioni
      const { error: updateError } = await supabase
        .from('voting_status')
        .update({ 
          voting_open: true,
          updated_at: new Date().toISOString()
        })
        .neq('id', 0);

      if (updateError) throw updateError;

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
