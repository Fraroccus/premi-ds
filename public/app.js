// Stato dell'applicazione
let currentUser = null;
let config = null;
let userVotes = {};
let results = null;
let currentSlide = 0;
let currentCategoryIndex = 0;

// Inizializzazione
document.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    checkVotingStatus();
    setupEventListeners();
});

// Carica configurazione
async function loadConfig() {
    try {
        const response = await fetch('/api/config');
        config = await response.json();
    } catch (error) {
        console.error('Errore nel caricamento della configurazione:', error);
    }
}

// Verifica stato votazioni
async function checkVotingStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        
        if (!status.votingOpen) {
            showScreen('closed-screen');
        }
    } catch (error) {
        console.error('Errore nella verifica dello stato:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('login-btn').addEventListener('click', handleLogin);
    document.getElementById('nickname-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    
    document.getElementById('submit-vote-btn').addEventListener('click', handleSubmitVote);
    
    // Top right settings button
    const openSettingsBtn = document.getElementById('open-settings-btn');
    if (openSettingsBtn) {
        openSettingsBtn.addEventListener('click', openPasswordModal);
    }

    // Settings back to nickname button
    const adminBackBtn = document.getElementById('admin-back-btn');
    if (adminBackBtn) {
        adminBackBtn.addEventListener('click', handleBackToNickname);
    }

    // Password modal listeners
    const modalCloseBtn = document.getElementById('modal-close-btn');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closePasswordModal);
    }

    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closePasswordModal);
    }

    const modalSubmitBtn = document.getElementById('modal-submit-btn');
    if (modalSubmitBtn) {
        modalSubmitBtn.addEventListener('click', handlePasswordSubmit);
    }

    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handlePasswordSubmit();
        });
    }

    const passwordInput = document.getElementById('admin-password-input');
    if (passwordInput) {
        passwordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handlePasswordSubmit();
            } else if (e.key === 'Escape') {
                closePasswordModal();
            }
        });
        passwordInput.addEventListener('input', () => {
            const errorElem = document.getElementById('password-error');
            if (errorElem) errorElem.textContent = '';
            passwordInput.classList.remove('input-error');
        });
    }

    const passwordModal = document.getElementById('password-modal');
    if (passwordModal) {
        passwordModal.addEventListener('click', (e) => {
            if (e.target === passwordModal) {
                closePasswordModal();
            }
        });
    }

    // Global keydown listeners
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closePasswordModal();
        }
        if (e.ctrlKey && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
            e.preventDefault();
            openPasswordModal();
        }
    });
    
    // Admin controls
    document.getElementById('toggle-voting-btn').addEventListener('click', handleToggleVoting);
    document.getElementById('reset-votes-btn').addEventListener('click', handleResetVotes);
    document.getElementById('show-results-btn').addEventListener('click', handleShowResults);
    
    // Slideshow controls
    document.getElementById('prev-slide').addEventListener('click', () => changeSlide(-1));
    document.getElementById('next-slide').addEventListener('click', () => changeSlide(1));
    document.getElementById('exit-presentation').addEventListener('click', () => showScreen('admin-screen'));
}

// Password modal controls
function openPasswordModal() {
    const modal = document.getElementById('password-modal');
    const input = document.getElementById('admin-password-input');
    const error = document.getElementById('password-error');
    if (error) error.textContent = '';
    if (input) {
        input.value = '';
        input.classList.remove('input-error');
    }
    if (modal) {
        modal.classList.add('active');
    }
    setTimeout(() => {
        if (input) input.focus();
    }, 60);
}

function closePasswordModal() {
    const modal = document.getElementById('password-modal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function handlePasswordSubmit() {
    const input = document.getElementById('admin-password-input');
    const error = document.getElementById('password-error');
    const password = input ? input.value : '';

    if (password === 'culoculo') {
        closePasswordModal();
        showScreen('admin-screen');
        updateAdminStatus();
    } else {
        if (error) {
            error.textContent = 'Password errata!';
        }
        if (input) {
            input.classList.add('input-error');
            input.select();
            input.focus();
        }
    }
}

function handleBackToNickname() {
    showScreen('login-screen');
    const input = document.getElementById('nickname-input');
    if (input) {
        input.focus();
    }
}

// Gestione login
async function handleLogin() {
    const nickname = document.getElementById('nickname-input').value.trim();
    const errorElement = document.getElementById('login-error');
    
    if (!nickname) {
        errorElement.textContent = 'Inserisci un nickname valido';
        return;
    }
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = nickname;
            document.getElementById('user-nickname').textContent = nickname;
            loadVotingScreen();
            showScreen('voting-screen');
        } else {
            errorElement.textContent = data.error || 'Errore durante la registrazione';
        }
    } catch (error) {
        errorElement.textContent = 'Errore di connessione: ' + error.message;
    }
}

// Carica schermata votazione
function loadVotingScreen() {
    const container = document.getElementById('categories-container');
    container.innerHTML = '';
    
    // Crea barra di navigazione categorie
    const navBar = document.createElement('div');
    navBar.className = 'category-nav';
    navBar.innerHTML = `
        <div class="category-nav-buttons" id="category-nav-buttons"></div>
        <div class="category-progress" id="category-progress"></div>
    `;
    container.appendChild(navBar);
    
    const navButtons = document.getElementById('category-nav-buttons');
    
    config.categories.forEach((category, index) => {
        const btn = document.createElement('button');
        btn.className = 'category-nav-btn';
        btn.textContent = category.name;
        btn.dataset.index = index;
        btn.addEventListener('click', () => showCategory(index));
        navButtons.appendChild(btn);
    });
    
    // Crea le categorie
    config.categories.forEach((category, index) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category';
        categoryDiv.dataset.categoryId = category.id;
        categoryDiv.innerHTML = `
            <h3>${category.name}</h3>
            <p style="color: #888; margin-bottom: 15px;">Seleziona 1°, 2° e 3° posto</p>
            <div class="nominations" id="category-${category.id}">
                ${category.nominations.map(nom => `
                    <div class="nomination" data-category="${category.id}" data-nomination="${nom.id}">
                        <img src="${nom.image}" alt="${nom.name}" class="nomination-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22100%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22%3E?%3C/text%3E%3C/svg%3E'">
                        <div class="nomination-info">
                            <div class="nomination-name">${nom.name}</div>
                            <div class="position-selector">
                                <button class="position-btn" data-position="first">1° Posto (4pt)</button>
                                <button class="position-btn" data-position="second">2° Posto (2pt)</button>
                                <button class="position-btn" data-position="third">3° Posto (1pt)</button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        container.appendChild(categoryDiv);
    });
    
    // Aggiungi controlli navigazione
    const navControls = document.createElement('div');
    navControls.className = 'category-navigation-controls';
    navControls.innerHTML = `
        <button id="prev-category-btn" class="nav-btn">← Categoria Precedente</button>
        <button id="next-category-btn" class="nav-btn">Categoria Successiva →</button>
    `;
    container.appendChild(navControls);
    
    // Aggiungi bottone submit
    const submitBtn = document.createElement('button');
    submitBtn.id = 'submit-vote-btn';
    submitBtn.className = 'submit-btn';
    submitBtn.textContent = 'Invia Votazione';
    submitBtn.addEventListener('click', handleSubmitVote);
    container.appendChild(submitBtn);
    
    // Aggiungi event listeners per i pulsanti di selezione
    document.querySelectorAll('.position-btn').forEach(btn => {
        btn.addEventListener('click', handlePositionSelect);
    });
    
    // Event listeners per navigazione
    document.getElementById('prev-category-btn').addEventListener('click', () => {
        if (currentCategoryIndex > 0) {
            showCategory(currentCategoryIndex - 1);
        }
    });
    
    document.getElementById('next-category-btn').addEventListener('click', () => {
        if (currentCategoryIndex < config.categories.length - 1) {
            showCategory(currentCategoryIndex + 1);
        }
    });
    
    // Mostra prima categoria
    showCategory(0);
    updateProgress();
}

// Mostra categoria specifica
function showCategory(index) {
    currentCategoryIndex = index;
    
    // Aggiorna categorie visibili
    document.querySelectorAll('.category').forEach((cat, idx) => {
        cat.classList.toggle('active', idx === index);
    });
    
    // Aggiorna bottoni navigazione
    document.querySelectorAll('.category-nav-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === index);
    });
    
    // Aggiorna stato bottoni prev/next
    document.getElementById('prev-category-btn').disabled = index === 0;
    document.getElementById('next-category-btn').disabled = index === config.categories.length - 1;
    
    updateProgress();
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Gestione selezione posizione
function handlePositionSelect(e) {
    const btn = e.target;
    const nomination = btn.closest('.nomination');
    const categoryId = nomination.dataset.category;
    const nominationId = nomination.dataset.nomination;
    const position = btn.dataset.position;
    
    // Inizializza categoria se non esiste
    if (!userVotes[categoryId]) {
        userVotes[categoryId] = {};
    }
    
    // Rimuovi selezione precedente per questa posizione
    const previousNomination = Object.keys(userVotes[categoryId]).find(
        key => userVotes[categoryId][key] === position
    );
    
    if (previousNomination === nominationId) {
        // Deseleziona se clicchi di nuovo
        delete userVotes[categoryId][position];
        updateVotingUI(categoryId);
        return;
    }
    
    if (previousNomination) {
        delete userVotes[categoryId][previousNomination];
    }
    
    // Aggiungi nuova selezione
    userVotes[categoryId][position] = nominationId;
    
    updateVotingUI(categoryId);
    updateProgress();
}

// Aggiorna UI votazione
function updateVotingUI(categoryId) {
    const categoryElement = document.getElementById(`category-${categoryId}`);
    const nominations = categoryElement.querySelectorAll('.nomination');
    
    nominations.forEach(nomination => {
        const nominationId = nomination.dataset.nomination;
        const buttons = nomination.querySelectorAll('.position-btn');
        
        // Reset classi
        nomination.classList.remove('selected-first', 'selected-second', 'selected-third');
        buttons.forEach(btn => {
            btn.classList.remove('active-first', 'active-second', 'active-third');
        });
        
        // Applica classi attive
        if (userVotes[categoryId]) {
            const votes = userVotes[categoryId];
            
            if (votes.first === nominationId) {
                nomination.classList.add('selected-first');
                buttons[0].classList.add('active-first');
            }
            if (votes.second === nominationId) {
                nomination.classList.add('selected-second');
                buttons[1].classList.add('active-second');
            }
            if (votes.third === nominationId) {
                nomination.classList.add('selected-third');
                buttons[2].classList.add('active-third');
            }
        }
    });
}

// Aggiorna progresso votazioni
function updateProgress() {
    let completedCount = 0;
    
    config.categories.forEach((category, index) => {
        const votes = userVotes[category.id];
        const isComplete = votes && votes.first && votes.second && votes.third;
        
        if (isComplete) {
            completedCount++;
        }
        
        // Aggiorna stato bottone navigazione
        const navBtn = document.querySelector(`[data-index="${index}"]`);
        if (navBtn) {
            if (isComplete) {
                navBtn.classList.add('completed');
            } else {
                navBtn.classList.remove('completed');
            }
        }
    });
    
    // Aggiorna testo progresso
    const progressText = document.getElementById('category-progress');
    if (progressText) {
        progressText.textContent = `Categorie completate: ${completedCount}/${config.categories.length}`;
    }
    
    // Mostra bottone submit se tutto completato
    const submitBtn = document.getElementById('submit-vote-btn');
    if (completedCount === config.categories.length) {
        submitBtn.classList.add('visible');
    } else {
        submitBtn.classList.remove('visible');
    }
}

// Invia votazione
async function handleSubmitVote() {
    // Verifica che tutte le categorie abbiano 3 voti
    const allCategoriesVoted = config.categories.every(category => {
        const votes = userVotes[category.id];
        return votes && votes.first && votes.second && votes.third;
    });
    
    if (!allCategoriesVoted) {
        alert('Devi selezionare 1°, 2° e 3° posto per tutte le categorie!');
        return;
    }
    
    try {
        const response = await fetch('/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nickname: currentUser,
                votes: userVotes
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showScreen('thank-you-screen');
        } else {
            alert('Errore: ' + (data.error || 'Impossibile inviare il voto'));
        }
    } catch (error) {
        alert('Errore di connessione nell\'invio del voto: ' + error.message);
    }
}

// Admin: Toggle votazioni
async function handleToggleVoting() {
    try {
        const response = await fetch('/api/admin/toggle-voting', {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) {
            alert('Errore: ' + (data.error || 'Operazione fallita'));
            return;
        }
        updateAdminStatus();
    } catch (error) {
        alert('Errore nell\'operazione: ' + error.message);
    }
}

// Admin: Reset votazioni
async function handleResetVotes() {
    if (!confirm('Sei sicuro di voler resettare tutte le votazioni?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/admin/reset', {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) {
            alert('Errore nel reset: ' + (data.error || 'Operazione non riuscita'));
            return;
        }
        alert('Votazioni resettate con successo');
        updateAdminStatus();
    } catch (error) {
        alert('Errore nel reset: ' + error.message);
    }
}

// Admin: Mostra risultati
async function handleShowResults() {
    try {
        const response = await fetch('/api/results');
        const data = await response.json();
        
        if (!response.ok) {
            alert(data.error || 'Le votazioni devono essere chiuse per vedere i risultati');
            return;
        }
        
        results = data;
        createSlideshow();
        showScreen('presentation-screen');
    } catch (error) {
        alert('Errore nel caricamento dei risultati: ' + error.message);
    }
}

// Aggiorna stato admin
async function updateAdminStatus() {
    try {
        const response = await fetch('/api/status');
        const status = await response.json();
        const statusElem = document.getElementById('voting-status');
        if (!statusElem) return;

        if (!response.ok) {
            statusElem.textContent = '⚠️ ' + (status.error || 'Errore database');
            statusElem.style.color = '#e74c3c';
            return;
        }

        statusElem.style.color = '#667eea';
        const statusText = status.votingOpen ? 
            `Votazioni APERTE - ${status.totalVoters} votanti` :
            `Votazioni CHIUSE - ${status.totalVoters} votanti`;
        
        statusElem.textContent = statusText;
    } catch (error) {
        const statusElem = document.getElementById('voting-status');
        if (statusElem) {
            statusElem.textContent = '⚠️ Errore connessione status';
            statusElem.style.color = '#e74c3c';
        }
    }
}

// Crea slideshow presentazione
function createSlideshow() {
    const container = document.getElementById('slideshow-container');
    container.innerHTML = '';
    currentSlide = 0;
    
    config.categories.forEach((category, index) => {
        const categoryResults = results[category.id];
        
        const slide = document.createElement('div');
        slide.className = 'slide';
        if (index === 0) slide.classList.add('active');
        
        // Primi 3 per il podio
        const top3 = categoryResults.ranking.slice(0, 3);
        // Tutti gli altri (dal 4° in poi)
        const others = categoryResults.ranking.slice(3);
        
        slide.innerHTML = `
            <h2>${categoryResults.categoryName}</h2>
            
            <!-- Podio per i primi 3 -->
            <div class="podium-container">
                ${top3.map((item, index) => {
                    const position = index === 0 ? 'first' : index === 1 ? 'second' : 'third';
                    const rank = index + 1;
                    return `
                        <div class="podium-position ${position}">
                            <div class="podium-rank rank-${rank}">${rank}°</div>
                            <img src="${item.image}" alt="${item.name}" class="podium-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22180%22%3E%3Crect fill=%22%23ddd%22 width=%22180%22 height=%22180%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2224%22%3E?%3C/text%3E%3C/svg%3E'">
                            <div class="podium-name">${item.name}</div>
                            <div class="podium-score">${item.score} punti</div>
                            <div class="podium-base">${rank}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            <!-- Altri classificati (dal 4° in poi - TUTTI) -->
            ${others.length > 0 ? `
                <div class="other-rankings">
                    <h3>Altri Classificati</h3>
                    ${others.map((item, index) => {
                        const rank = index + 4;
                        return `
                            <div class="ranking-item">
                                <div class="rank-position">${rank}°</div>
                                <img src="${item.image}" alt="${item.name}" class="ranking-image" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Crect fill=%22%23ddd%22 width=%22120%22 height=%22120%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2224%22%3E?%3C/text%3E%3C/svg%3E'">
                                <div class="ranking-info">
                                    <div class="ranking-name">${item.name}</div>
                                    <div class="ranking-score">${item.score} punti</div>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            ` : ''}
        `;
        
        container.appendChild(slide);
    });
    
    updateSlideCounter();
}

// Cambia slide
function changeSlide(direction) {
    const slides = document.querySelectorAll('.slide');
    slides[currentSlide].classList.remove('active');
    
    currentSlide += direction;
    
    if (currentSlide >= slides.length) currentSlide = 0;
    if (currentSlide < 0) currentSlide = slides.length - 1;
    
    slides[currentSlide].classList.add('active');
    updateSlideCounter();
}

// Aggiorna contatore slide
function updateSlideCounter() {
    const total = document.querySelectorAll('.slide').length;
    document.getElementById('slide-counter').textContent = `${currentSlide + 1} / ${total}`;
}

// Mostra schermata
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.classList.add('active');
    }

    // Gestione visibilità pulsante impostazioni
    const openSettingsBtn = document.getElementById('open-settings-btn');
    if (openSettingsBtn) {
        if (screenId === 'admin-screen' || screenId === 'presentation-screen') {
            openSettingsBtn.style.display = 'none';
        } else {
            openSettingsBtn.style.display = 'inline-flex';
        }
    }
}
