document.addEventListener('DOMContentLoaded', () => {
  const scoreboard = document.getElementById('scoreboard');
  const tabButtons = document.querySelectorAll('.tab-button');
  const lastUpdateFooter = document.getElementById('lastUpdate');

  function resetScoreboard() {
    // Conserver l’en-tête et le footer, mais supprimer uniquement les .entry et les messages d’erreur
    const entries = scoreboard.querySelectorAll('.entry');
    entries.forEach(entry => entry.remove());
    const messages = scoreboard.querySelectorAll('p');
    messages.forEach(p => p.remove());
  }

  function loadLeaderboard(type) {
    resetScoreboard(); // Réinitialiser avant chaque chargement pour éviter les états erronés

    fetch(`/api/leaderboard/${type}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        resetScoreboard(); // Réinitialiser à nouveau après la réponse pour un état propre

        if (!Array.isArray(data) || data.length === 0) {
          scoreboard.appendChild(document.createElement('p')).textContent = 'Aucune donnée disponible pour ce classement.';
          lastUpdateFooter.textContent = '';
          return;
        }

        // Débogage : afficher les dates trouvées
        console.log('Dates trouvées dans les données:', data.map(entry => entry.last_updated));

        // Trouver la date la plus récente dans last_updated
        let latestUpdate = null;
        for (const entry of data) {
          if (entry.last_updated && entry.last_updated.trim()) {
            // Tenter de parser la date au format "Dernière update le JJ.MM.AA à HH:MM"
            const dateMatch = entry.last_updated.match(/(\d{2})\.(\d{2})\.(\d{2}) à (\d{2}):(\d{2})/);
            if (dateMatch) {
              const [_, day, month, year, hour, minute] = dateMatch;
              const dateStr = `20${year}-${month}-${day}T${hour}:${minute}:00`; // Format ISO
              const currentDate = new Date(dateStr);
              if (!isNaN(currentDate.getTime())) { // Vérifier si la date est valide
                if (!latestUpdate || currentDate > new Date(latestUpdate)) {
                  latestUpdate = entry.last_updated;
                }
              } else {
                console.log(`Date invalide pour ${entry.player_name}:`, entry.last_updated);
              }
            } else {
              console.log(`Format de date invalide pour ${entry.player_name}:`, entry.last_updated);
            }
          } else {
            console.log(`last_updated manquant ou vide pour ${entry.player_name}`);
          }
        }

        // Afficher la dernière mise à jour dans le footer
        if (latestUpdate) {
          lastUpdateFooter.textContent = latestUpdate;
        } else {
          lastUpdateFooter.textContent = 'Non disponible';
          console.log('Aucune date valide trouvée dans les données.');
        }

        // Ajouter les entrées après l’en-tête et avant le footer, avec les classes pour les podiums
        data.forEach((entry, index) => {
          // Vérifier que les champs existent et sont valides
          const rank = entry.rank || 'N/A';
          const playerName = entry.player_name || 'Inconnu';
          const score = entry.score !== undefined ? entry.score : 0;

          const div = document.createElement('div');
          div.classList.add('entry');
          // Ajouter les classes pour les podiums (1er, 2e, 3e)
          if (index === 0) div.classList.add('podium-1');
          else if (index === 1) div.classList.add('podium-2');
          else if (index === 2) div.classList.add('podium-3');

          div.innerHTML = `
            <span>#${rank} ${playerName}</span>
            <span>${score}</span>
          `;
          scoreboard.insertBefore(div, lastUpdateFooter); // Insérer avant le footer
        });
      })
      .catch(error => {
        console.error('Erreur lors du chargement du leaderboard:', error);
        // Afficher un message d’erreur sans supprimer l’en-tête ou le footer
        resetScoreboard(); // Réinitialiser pour ne pas laisser d’état erroné
        scoreboard.appendChild(document.createElement('p')).textContent = 'Erreur lors du chargement des données.';
        lastUpdateFooter.textContent = '';
      });
  }

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      loadLeaderboard(button.dataset.tab);
    });
  });

  // Charger le leaderboard standard par défaut
  loadLeaderboard('standard');
});
