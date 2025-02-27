document.addEventListener('DOMContentLoaded', () => {
    // Reload-Button Funktionalität
    const reloadButton = document.getElementById('reload-button');
    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        location.reload();
      });
    }
  
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
  
    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        // Entferne aktive Klasse von allen Buttons
        tabButtons.forEach(btn => btn.classList.remove('active'));
        // Blende alle Inhalte aus
        tabContents.forEach(content => content.style.display = 'none');
  
        // Aktiviere den geklickten Button und zeige den zugehörigen Tab
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        document.getElementById(tabId).style.display = 'block';
      });
    });
  
    // Standardmäßig den ersten Tab aktivieren
    if (tabButtons.length > 0) {
      tabButtons[0].click();
    }
  });
  