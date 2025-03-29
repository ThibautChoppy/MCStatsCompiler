document.addEventListener('DOMContentLoaded', () => {
  const scoreboard = document.getElementById('scoreboard');
  const tabButtons = document.querySelectorAll('.tab-button');
  const lastUpdateFooter = document.getElementById('lastUpdate');
  const searchInput = document.getElementById('searchInput');
  const searchButton = document.getElementById('searchButton');
  const searchResults = document.getElementById('searchResults');
  const loading = document.getElementById('loading');
  const errorModal = document.getElementById('errorModal');
  const errorMessage = document.getElementById('errorMessage');
  const closeModal = document.querySelector('.close');
  const totalPlayers = document.getElementById('totalPlayers');
  const totalScore = document.getElementById('totalScore');

  let currentTab = 'standard';
  let searchTimeout = null;

  // Fonction pour afficher les erreurs
  function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'block';
  }

  // Fermer la modal d'erreur
  closeModal.onclick = () => {
    errorModal.style.display = 'none';
  };

  window.onclick = (event) => {
    if (event.target === errorModal) {
      errorModal.style.display = 'none';
    }
  };

  // Fonction pour charger les statistiques globales
  function loadStats() {
    fetch('/api/stats')
      .then(response => {
        if (!response.ok) throw new Error('Erreur lors du chargement des statistiques');
        return response.json();
      })
      .then(data => {
        totalPlayers.textContent = data.totalPlayers.toLocaleString();
        totalScore.textContent = data.totalScore.toLocaleString();
      })
      .catch(error => {
        console.error('Erreur:', error);
        showError('Impossible de charger les statistiques');
      });
  }

  function resetScoreboard() {
    const entries = scoreboard.querySelectorAll('.entry');
    entries.forEach(entry => entry.remove());
    const messages = scoreboard.querySelectorAll('p');
    messages.forEach(p => p.remove());
    searchResults.innerHTML = '';
  }

  function showLoading() {
    loading.style.display = 'block';
  }

  function hideLoading() {
    loading.style.display = 'none';
  }

  function loadLeaderboard(type) {
    showLoading();
    resetScoreboard();

    fetch(`/api/leaderboard/${type}`)
      .then(response => {
        if (!response.ok) throw new Error(`Erreur HTTP! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        hideLoading();
        resetScoreboard();

        if (!Array.isArray(data) || data.length === 0) {
          scoreboard.appendChild(document.createElement('p')).textContent = 'Aucune donnée disponible pour ce classement.';
          lastUpdateFooter.textContent = '';
          return;
        }

        let latestUpdate = null;
        for (const entry of data) {
          if (entry.last_updated && entry.last_updated.trim()) {
            const dateMatch = entry.last_updated.match(/(\d{2})\.(\d{2})\.(\d{2}) à (\d{2}):(\d{2})/);
            if (dateMatch) {
              const [_, day, month, year, hour, minute] = dateMatch;
              const dateStr = `20${year}-${month}-${day}T${hour}:${minute}:00`;
              const currentDate = new Date(dateStr);
              if (!isNaN(currentDate.getTime())) {
                if (!latestUpdate || currentDate > new Date(latestUpdate)) {
                  latestUpdate = entry.last_updated;
                }
              }
            }
          }
        }

        lastUpdateFooter.textContent = latestUpdate || 'Non disponible';

        data.forEach((entry, index) => {
          const rank = entry.rank || 'N/A';
          const playerName = entry.player_name || 'Inconnu';
          const score = entry.score !== undefined ? entry.score : 0;

          const div = document.createElement('div');
          div.classList.add('entry');
          if (index === 0) div.classList.add('podium-1');
          else if (index === 1) div.classList.add('podium-2');
          else if (index === 2) div.classList.add('podium-3');

          div.innerHTML = `
            <span>#${rank}</span>
            <span>${playerName}</span>
            <span>${score.toLocaleString()}</span>
          `;
          scoreboard.insertBefore(div, lastUpdateFooter);
        });
      })
      .catch(error => {
        hideLoading();
        console.error('Erreur lors du chargement du leaderboard:', error);
        showError('Erreur lors du chargement des données');
        lastUpdateFooter.textContent = '';
      });
  }

  function performSearch(query) {
    if (query.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    showLoading();
    fetch(`/api/search/${encodeURIComponent(query)}`)
      .then(response => {
        if (!response.ok) throw new Error(`Erreur HTTP! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        hideLoading();
        searchResults.innerHTML = '';

        if (!Array.isArray(data) || data.length === 0) {
          searchResults.innerHTML = '<p>Aucun résultat trouvé</p>';
          return;
        }

        const resultsList = document.createElement('div');
        resultsList.classList.add('search-results-list');

        // Grouper les résultats par type
        const groupedResults = data.reduce((acc, result) => {
          if (!acc[result.type]) {
            acc[result.type] = [];
          }
          acc[result.type].push(result);
          return acc;
        }, {});

        // Afficher les résultats par type dans l'ordre : standard, shiny, legendary, money
        ['standard', 'shiny', 'legendary', 'money'].forEach(type => {
          const results = groupedResults[type] || [];
          if (results.length > 0) {
            results.forEach(result => {
              const div = document.createElement('div');
              div.classList.add('search-result');
              const typeLabel = {
                'standard': 'Standard',
                'shiny': 'Shiny',
                'legendary': 'Légendaire',
                'money': 'Money'
              }[result.type];
              div.innerHTML = `
                <span>#${result.rank}</span>
                <span>${result.player_name}</span>
                <span>${result.score.toLocaleString()}</span>
                <span class="type-badge ${result.type}">${typeLabel}</span>
              `;
              resultsList.appendChild(div);
            });
          }
        });

        searchResults.appendChild(resultsList);
      })
      .catch(error => {
        hideLoading();
        console.error('Erreur lors de la recherche:', error);
        showError('Erreur lors de la recherche');
      });
  }

  // Gestionnaires d'événements
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      currentTab = button.dataset.tab;
      loadLeaderboard(currentTab);
    });
  });

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => performSearch(e.target.value), 300);
  });

  searchButton.addEventListener('click', () => {
    performSearch(searchInput.value);
  });

  // Chargement initial
  loadStats();
  loadLeaderboard(currentTab);
});

