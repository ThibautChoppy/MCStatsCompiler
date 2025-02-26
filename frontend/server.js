const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = process.env.PORT || 8080; // Utilisons 8080 comme dans ton output

const dbPath = process.env.DB_PATH || '/data/scoreboard.db';
const db = new sqlite3.Database(dbPath);

app.use(express.static(path.join(__dirname, 'public')));

// Fonction pour convertir les buffers en nombres
function convertBufferToNumber(buffer) {
  if (Buffer.isBuffer(buffer)) {
    return buffer.readInt32LE(0); // Lire un entier 32 bits en little-endian
  }
  return buffer; // Retourner tel quel si ce n'est pas un buffer
}

app.get('/api/leaderboard/:type', (req, res) => {
  const type = req.params.type;
  const tableMap = {
    standard: 'standard_leaderboard',
    shiny: 'shiny_leaderboard',
    legendary: 'legendary_leaderboard'
  };
  const table = tableMap[type] || 'standard_leaderboard';

  db.all(`SELECT * FROM ${table} ORDER BY rank ASC`, (err, rows) => {
    if (err) {
      console.error('Erreur SQLite:', err.message);
      res.status(500).json({ error: err.message });
      return;
    }

    const processedRows = rows.map(row => ({
      rank: convertBufferToNumber(row.rank),
      player_name: row.player_name,
      score: convertBufferToNumber(row.score),
      last_updated: row.last_updated || 'Non disponible' // Valeur par défaut si manquant
    }));

    console.log(`Données pour ${table}:`, processedRows);
    res.json(processedRows);
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
