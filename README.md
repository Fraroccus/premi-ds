# Sistema Votazione Premi

Sistema di votazione per premi stile Game Awards / Oscar.

## Struttura del Progetto

```
Premi/
├── server.js           # Server Node.js
├── package.json        # Dipendenze
├── config.json         # Configurazione categorie e nomination
├── votes.json          # Dati voti (generato automaticamente)
└── public/
    ├── index.html      # Pagina principale
    ├── style.css       # Stili
    ├── app.js          # Logica client
    └── images/         # Cartella per le immagini delle nomination
```

## Installazione

1. Installa Node.js se non l'hai già
2. Apri il terminale nella cartella del progetto
3. Esegui: `npm install`

## Configurazione Categorie e Nomination

Modifica il file `config.json` con le tue categorie e nomination:

```json
{
  "categories": [
    {
      "id": "categoria-1",
      "name": "Nome Categoria",
      "nominations": [
        {
          "id": "nomination-1",
          "name": "Nome Candidato",
          "image": "images/candidato1.jpg"
        }
      ]
    }
  ]
}
```

### Immagini

Crea una cartella `public/images/` e inserisci le immagini dei candidati. Assicurati che i percorsi nel `config.json` corrispondano ai file.

## Avvio del Server

Esegui: `npm start`

Il sito sarà disponibile su: http://localhost:3000

## Utilizzo

### Per i Votanti

1. Vai su http://localhost:3000
2. Inserisci un nickname
3. Vota per ogni categoria selezionando 1°, 2° e 3° posto
4. Invia la votazione

### Per l'Admin

1. Premi `Ctrl + Shift + A` per accedere al pannello admin
2. Da qui puoi:
   - Chiudere/Aprire le votazioni
   - Reset delle votazioni
   - Visualizzare la presentazione dei risultati

### Presentazione Risultati

- La presentazione mostra ogni categoria in una slide separata
- Naviga con i pulsanti "Precedente" e "Successiva"
- Mostra la classifica completa con punteggi

## Sistema di Punteggio

- 1° posto: 4 punti
- 2° posto: 2 punti
- 3° posto: 1 punto
