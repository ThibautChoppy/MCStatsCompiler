const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 8080;

const dbPath = process.env.DB_PATH || '/data/scoreboard.db';
console.log('Tentative de connexion à la base de données:', dbPath);
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
  } else {
    console.log('Connexion à la base de données établie avec succès');
  }
});

// Configuration du cache
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const imageCache = new Map();

app.use(express.static(path.join(__dirname, 'public')));

// Middleware pour la gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Une erreur est survenue',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Fonction pour convertir les buffers en nombres
function convertBufferToNumber(buffer) {
  if (Buffer.isBuffer(buffer)) {
    return buffer.readInt32LE(0);
  }
  return buffer;
}

// Fonction pour calculer le hash d'une image
function calculateImageHash(imagePath) {
  const fileBuffer = fs.readFileSync(imagePath);
  return crypto.createHash('md5').update(fileBuffer).digest('hex');
}

// Route pour les images avec cache
app.get('/api/images/:type/:filename', (req, res) => {
  const { type, filename } = req.params;
  const imagePath = path.join(__dirname, 'public', 'images', type, filename);
  
  if (!fs.existsSync(imagePath)) {
    return res.status(404).json({ error: 'Image non trouvée' });
  }

  const imageHash = calculateImageHash(imagePath);
  const cachedImage = imageCache.get(imageHash);

  if (cachedImage && Date.now() - cachedImage.timestamp < CACHE_DURATION) {
    return res.send(cachedImage.data);
  }

  const imageData = fs.readFileSync(imagePath);
  imageCache.set(imageHash, {
    data: imageData,
    timestamp: Date.now()
  });

  res.send(imageData);
});

// Route pour les statistiques globales
app.get('/api/stats', (req, res) => {
  console.log('Requête reçue sur /api/stats');
  const stats = {};
  
  db.get('SELECT COUNT(*) as total_players FROM standard_leaderboard', (err, row) => {
    if (err) {
      console.error('Erreur lors du comptage des joueurs:', err.message);
      return res.status(500).json({ error: err.message });
    }
    console.log('Nombre de joueurs trouvés:', row?.total_players);
    stats.totalPlayers = row?.total_players || 0;
    
    db.get('SELECT SUM(score) as total_score FROM standard_leaderboard', (err, row) => {
      if (err) {
        console.error('Erreur lors du calcul du score total:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Score total trouvé:', row?.total_score);
      stats.totalScore = row?.total_score || 0;
      res.json(stats);
    });
  });
});

app.get('/api/leaderboard/:type', (req, res) => {
  const type = req.params.type;
  const tableMap = {
    standard: 'standard_leaderboard',
    shiny: 'shiny_leaderboard',
    legendary: 'legendary_leaderboard',
    money: 'money_leaderboard'
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
      last_updated: row.last_updated || 'Non disponible'
    }));

    res.json(processedRows);
  });
});

// Route pour la recherche de joueurs
app.get('/api/search/:query', (req, res) => {
  const query = `%${req.params.query}%`;
  const tables = ['standard_leaderboard', 'shiny_leaderboard', 'legendary_leaderboard', 'money_leaderboard'];
  const results = [];

  let completedQueries = 0;

  tables.forEach(table => {
    db.all(
      `SELECT rank, player_name, score, last_updated, '${table}' as type 
       FROM ${table} 
       WHERE player_name LIKE ? 
       ORDER BY rank ASC 
       LIMIT 5`,
      [query],
      (err, rows) => {
        if (err) {
          console.error(`Erreur lors de la recherche dans ${table}:`, err);
          return;
        }

        // Process rows with correct type and convert numbers
        const processedRows = rows.map(row => ({
          rank: convertBufferToNumber(row.rank),
          player_name: row.player_name,
          score: convertBufferToNumber(row.score),
          last_updated: row.last_updated || 'Non disponible',
          type: table.replace('_leaderboard', '')
        }));

        results.push(...processedRows);
        
        completedQueries++;
        if (completedQueries === tables.length) {
          // Sort results by type and rank
          results.sort((a, b) => {
            if (a.type !== b.type) {
              return tables.indexOf(a.type + '_leaderboard') - tables.indexOf(b.type + '_leaderboard');
            }
            return a.rank - b.rank;
          });
          res.json(results);
        }
      }
    );
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
