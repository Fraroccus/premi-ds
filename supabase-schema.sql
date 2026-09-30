-- Tabella per lo stato delle votazioni
CREATE TABLE IF NOT EXISTS voting_status (
  id SERIAL PRIMARY KEY,
  voting_open BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserisci uno stato iniziale se non esiste
INSERT INTO voting_status (id, voting_open)
VALUES (1, true)
ON CONFLICT (id) DO NOTHING;

-- Tabella per i voti
CREATE TABLE IF NOT EXISTS votes (
  id SERIAL PRIMARY KEY,
  nickname VARCHAR(50) NOT NULL,
  votes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indici per performance
CREATE INDEX IF NOT EXISTS idx_votes_nickname ON votes(nickname);
CREATE INDEX IF NOT EXISTS idx_votes_created_at ON votes(created_at);

-- RLS (Row Level Security)
ALTER TABLE voting_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Reset e ricreazione policy per voting_status (evita errore 42710)
DROP POLICY IF EXISTS "Enable read access for all users" ON voting_status;
DROP POLICY IF EXISTS "Enable write access for all users" ON voting_status;
DROP POLICY IF EXISTS "Enable insert access for all users" ON voting_status;

CREATE POLICY "Enable read access for all users" ON voting_status FOR SELECT USING (true);
CREATE POLICY "Enable write access for all users" ON voting_status FOR UPDATE USING (true);
CREATE POLICY "Enable insert access for all users" ON voting_status FOR INSERT WITH CHECK (true);

-- Reset e ricreazione policy per votes (evita errore 42710)
DROP POLICY IF EXISTS "Enable read access for all users" ON votes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON votes;
DROP POLICY IF EXISTS "Enable delete access for all users" ON votes;

CREATE POLICY "Enable read access for all users" ON votes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON votes FOR DELETE USING (true);
