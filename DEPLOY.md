# Premi Bonobi - Deployment su GitHub, Supabase e Vercel

Guida completa passo-passo per pubblicare il repository su GitHub, collegare il database Supabase e fare il deploy su Vercel.

---

## 🗄️ 1. Setup del Database su Supabase

1. Vai su [supabase.com](https://supabase.com) e accedi (o crea un account gratuito).
2. Clicca su **New Project**, assegna un nome (es. `premi-bonobi`) e scegli una password per il database e una regione vicina (es. `Central EU (Frankfurt)`).
3. Una volta creato il progetto, apri dal menu laterale la voce **SQL Editor** (icona con terminale/SQL).
4. Clicca **New query**, copia e incolla l'intero contenuto del file `supabase-schema.sql`:
   - Crea la tabella `voting_status` (con stato iniziale `voting_open = true`).
   - Crea la tabella `votes` (con campi per `nickname` e `votes` JSONB).
   - Abilita Row Level Security (RLS) e imposta le policy di lettura, inserimento e cancellazione (necessaria per il reset da admin).
5. Clicca **Run** (o premi `Ctrl + Enter`). Verifica che l'output confermi il successo.
6. Dal menu laterale vai su **Project Settings** (icona ingranaggio) -> **API**:
   - Copia il **Project URL** (es. `https://xyzcompany.supabase.co`).
   - Copia la **Project API keys -> `anon` / `public`**.
   *(Queste due chiavi ti serviranno nei passaggi successivi per Vercel).*

---

## 🐙 2. Push del codice su GitHub

Se non hai ancora inizializzato il repository git o vuoi aggiornare quello esistente:

```bash
# 1. Inizializza git (se non già inizializzato)
git init

# 2. Aggiungi tutti i file
git add .

# 3. Effettua il commit
git commit -m "Update voting app with Supabase API and settings button"

# 4. Imposta il branch principale su main
git branch -M main

# 5. Collega il tuo repository remoto su GitHub
# (Sostituisci con l'URL del tuo repository se diverso)
git remote add origin https://github.com/Fraroccus/Premi-bonobi.git

# 6. Esegui il push
git push -u origin main --force
```

---

## ▲ 3. Deploy su Vercel

1. Vai su [vercel.com](https://vercel.com) e accedi con il tuo account GitHub.
2. Clicca su **Add New...** -> **Project**.
3. Seleziona il repository GitHub `Premi-bonobi` e clicca **Import**.
4. Nella schermata **Configure Project**:
   - **Framework Preset**: Seleziona **Other** (il progetto include `vercel.json`).
   - **Root Directory**: Lascia `./` (radice).
   - **Environment Variables**: espandi la sezione e aggiungi:
     - Nome: `SUPABASE_URL` | Valore: `[Il tuo Project URL di Supabase]`
     - Nome: `SUPABASE_ANON_KEY` | Valore: `[La tua anon public key di Supabase]`
5. Clicca **Deploy**.
6. Vercel completerà il build e ti fornirà un URL live (es. `https://premi-bonobi.vercel.app`).

---

## 💻 4. Test Locale (Opzionale)

Puoi avviare il server in locale in due modalità:

```bash
npm install
npm run dev
```

- **Senza Supabase**: usa automaticamente il file locale `votes.json`.
- **Con Supabase**: crea un file `.env` locale contenente:
  ```env
  SUPABASE_URL=https://tuo-progetto.supabase.co
  SUPABASE_ANON_KEY=tua-chiave-anonima
  ```
  Il server utilizzerà direttamente il database Supabase!

---

## ⚙️ Funzionalità & Utilizzo

- **Votazione**:
  - Inserimento nickname e selezione di 1°, 2° e 3° classificato per ciascuna categoria.
  - Punteggi: 1° = 4 pt, 2° = 2 pt, 3° = 1 pt.
- **Pannello Impostazioni**:
  - Clicca sul pulsante **⚙️ Impostazioni** in alto a destra (oppure `Ctrl + Shift + A`).
  - Inserisci la password: `culoculo`.
  - Da qui puoi:
    - Chiudere o riaprire le votazioni in tempo reale.
    - Resettare tutti i voti.
    - Avviare la presentazione delle slide con podio e classifiche animate.
  - Per tornare alla pagina di inserimento del nickname, clicca sul pulsante **← Torna al Nickname** in alto a sinistra.
