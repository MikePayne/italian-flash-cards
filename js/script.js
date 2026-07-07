// List configuration
const vocabularyLists = [
    { id: 'essential-verbs', name: 'Essential Verbs', count: 32, file: 'vocab/essential-verbs.json' },
    { id: 'essential-misc', name: 'Essential Misc', count: 0, file: 'vocab/essential-misc.json' },
    { id: 'household', name: 'Household Items', count: 0, file: 'vocab/household-items.json' },
    { id: 'dining', name: 'Dining Vocabulary', count: 0, file: 'vocab/dining.json' },
    { id: 'cooking', name: 'Cooking Vocabulary', count: 0, file: 'vocab/cooking.json' },
    { id: 'hiking', name: 'Hiking Vocabulary', count: 0, file: 'vocab/hiking.json' },
    { id: 'medical', name: 'Medical Emergencies', count: 0, file: 'vocab/medical.json' },
    { id: 'swear-words', name: 'Swear Words', count: 0, file: 'vocab/swear-words.json' },
    { id: 'dirty-talk', name: 'Dirty Talk', count: 0, file: 'vocab/dirty-talk.json'}
];

let currentList = null;
let cards = [];
let currentIndex = 0;
let correctCount = 0;
let incorrectCount = 0;
let isFlipped = false;
let italianFirst = true; // Toggle state: true = Italian first, false = English first
let history = []; // track answers for undo functionality

function initializeMenu() {
    const container = document.getElementById('listsContainer');
    container.innerHTML = '';

    vocabularyLists.forEach(list => {
        const stats = getListStats(list.id);
        const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
        const scoreColor = getScoreColor(percentage, stats.total);
        
        const card = document.createElement('div');
        card.className = `list-card ${scoreColor}`;
        card.onclick = () => loadList(list);
        card.innerHTML = `
            <div class="list-name">${list.name}</div>
            <div class="list-stats">${list.count} Cards</div>
            <div class="list-score-container">
                <div class="list-score-bar">
                    <div class="list-score-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="list-score-text">${stats.total > 0 ? percentage + '%' : 'No attempts'}</div>
            </div>
        `;
        container.appendChild(card);
    });
}

function getListStats(listId) {
    const data = localStorage.getItem(`italian-vocab-${listId}`);
    if (!data) return { wordCount: 0, correct: 0, total: 0 };
    
    const parsed = JSON.parse(data);
    return {
        wordCount: parsed.wordCount || 0,
        correct: parsed.correct || 0,
        total: parsed.total || 0
    };
}

function getScoreColor(percentage, total) {
    if (total === 0) return 'score-grey';
    if (percentage === 100) return 'score-green';
    if (percentage >= 80) return 'score-lightgreen';
    if (percentage >= 60) return 'score-yellow';
    if (percentage >= 40) return 'score-orange';
    return 'score-red';
}

function saveListStats(listId, wordCount, correct, total) {
    const data = {
        wordCount,
        correct,
        total,
        date: new Date().toISOString()
    };
    localStorage.setItem(`italian-vocab-${listId}`, JSON.stringify(data));
}

async function loadList(list) {
    currentList = list;
    document.getElementById('menuScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    document.getElementById('endScreen').classList.add('hidden');

    const errorDiv = document.getElementById('errorMessage');
    errorDiv.classList.add('hidden');

    try {
        const response = await fetch(list.file);
        if (!response.ok) throw new Error('Failed to load list');
        
        const data = await response.json();
        cards = [...data];
        currentIndex = 0;
        correctCount = 0;
        incorrectCount = 0;
        italianFirst = true; // Reset to Italian first when loading new list
        
        document.getElementById('correctCount').textContent = '0';
        document.getElementById('incorrectCount').textContent = '0';
        
        shuffleArray(cards);
        updateModeIndicator();
        showCard();
    } catch (error) {
        errorDiv.textContent = `Error loading ${list.name}: ${error.message}. Make sure the JSON file exists.`;
        errorDiv.classList.remove('hidden');
        document.getElementById('menuScreen').classList.remove('hidden');
        document.getElementById('gameScreen').classList.add('hidden');
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function toggleMode() {
    italianFirst = !italianFirst;
    updateModeIndicator();
    showCard();
}

function updateModeIndicator() {
    const indicator = document.getElementById('modeIndicator');
    if (indicator) {
        indicator.textContent = italianFirst ? 'Mode: Italian → English' : 'Mode: English → Italian';
    }
}

function showCard() {
    if (currentIndex >= cards.length) {
        showEndScreen();
        return;
    }

    const card = cards[currentIndex];
    const cardElement = document.getElementById('card');
    cardElement.classList.remove('flipped', 'swiping-left', 'swiping-right');
    isFlipped = false;

    document.getElementById('wordLabel').textContent = card.type;
    
    // Set main word based on mode
    if (italianFirst) {
        document.getElementById('italianWord').textContent = card.italian;
        document.getElementById('pronunciation').textContent = card.pronunciation || '';
    } else {
        document.getElementById('italianWord').textContent = card.english;
        document.getElementById('pronunciation').textContent = '';
    }

    // Build back content with both languages always visible
    let backHTML = `
        <div class="dual-display">
            <div class="language-section">
                <div class="language-label">Italian</div>
                <div class="language-content">${card.italian}</div>
            </div>
            <div class="language-section">
                <div class="language-label">English</div>
                <div class="language-content">${card.english}</div>
            </div>
            ${card.pronunciation ? `
            <div class="language-section">
                <div class="language-label">Pronunciation</div>
                <div class="language-content">${card.pronunciation}</div>
            </div>
            ` : ''}
        </div>
    `;

    if (card.type === 'verb') {
        backHTML += `
            <div class="back-section">
                <div class="back-section-title">Present Tense</div>
                <div class="conjugation-table">
        `;
        card.conjugations.present.forEach(conj => {
            backHTML += `
                <div>
                    <span class="conjugation-person">${conj.person}</span>
                    <span class="conjugation-form">${conj.form}</span>
                </div>
            `;
        });
        backHTML += `</div></div>`;
    }

    if (card.type === 'noun') {
        backHTML += `
            <div class="back-section">
                <div class="back-section-title">Forms</div>
                <div class="singular-plural">
                    <div class="singular-plural-row">
                        <span class="sp-label">Singular:</span>
                        <span class="sp-form">${card.singularPlural.singular.article} ${card.singularPlural.singular.form}</span>
                    </div>
                    <div class="singular-plural-row">
                        <span class="sp-label">Plural:</span>
                        <span class="sp-form">${card.singularPlural.plural.article} ${card.singularPlural.plural.form}</span>
                    </div>
                </div>
            </div>
        `;
    }

    if (card.type === 'phrase' && card.context) {
        backHTML += `
            <div class="back-section">
                <div class="back-section-title">Context</div>
                <div style="font-size: 13px;">${card.context}</div>
            </div>
        `;
    }

    backHTML += `<div class="back-section"><div class="back-section-title">Examples</div>`;
    card.examples.forEach(example => {
        backHTML += `
            <div class="example">
                <div class="example-italian"><strong>IT:</strong> ${example.italian}</div>
                <div class="example-english"><strong>EN:</strong> ${example.english}</div>
            </div>
        `;
    });
    backHTML += `</div>`;

    document.getElementById('backContent').innerHTML = backHTML;
    updateProgress();
}

function updateProgress() {
    const progress = ((currentIndex) / cards.length) * 100;
    document.getElementById('progressFill').style.width = progress + '%';
}

function flipCard() {
    const cardElement = document.getElementById('card');
    cardElement.classList.toggle('flipped');
    isFlipped = !isFlipped;
}

document.getElementById('card').addEventListener('click', flipCard);

// Touch swipe handling
let touchStartX = 0;
let touchEndX = 0;

const cardContainer = document.getElementById('cardContainer');
cardContainer.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
}, false);

cardContainer.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
}, false);

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;

    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            cardNo();
        } else {
            cardYes();
        }
    }
}

function cardYes() {
    const cardElement = document.getElementById('card');
    cardElement.classList.add('swiping-right');
    correctCount++;
    document.getElementById('correctCount').textContent = correctCount;
    
    // Add to history
    history.push({
        index: currentIndex,
        answer: 'yes'
    });
    
    setTimeout(() => {
        currentIndex++;
        showCard();
    }, 300);
}

function cardNo() {
    const cardElement = document.getElementById('card');
    cardElement.classList.add('swiping-left');
    incorrectCount++;
    document.getElementById('incorrectCount').textContent = incorrectCount;
    
    // Add to history
    history.push({
        index: currentIndex,
        answer: 'no'
    });
    
    setTimeout(() => {
        currentIndex++;
        showCard();
    }, 300);
}

function undoLastSwipe() {
    if (history.length === 0) {
        return; // Nothing to undo
    }

    const lastAction = history.pop();
    
    // Restore the previous index
    currentIndex = lastAction.index;
    
    // Decrement the appropriate count
    if (lastAction.answer === 'yes') {
        correctCount--;
    } else {
        incorrectCount--;
    }
    
    // Update display
    document.getElementById('correctCount').textContent = correctCount;
    document.getElementById('incorrectCount').textContent = incorrectCount;
    
    // Show the card again
    showCard();
}


function showEndScreen() {
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('endScreen').classList.remove('hidden');
    document.getElementById('finalCorrect').textContent = correctCount;
    document.getElementById('finalIncorrect').textContent = incorrectCount;
    
    // Save scores
    saveListStats(currentList.id, cards.length, correctCount, correctCount + incorrectCount);
}

function backToMenu() {
    document.getElementById('menuScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
    document.getElementById('endScreen').classList.add('hidden');
    history = []; // Reset history when going back to menu
    initializeMenu();
}


// Keyboard navigation
document.addEventListener('keydown', (e) => {
    // Only respond to arrow keys when game screen is visible
    if (document.getElementById('gameScreen').classList.contains('hidden')) {
        return;
    }

    if (e.key === 'ArrowRight') {
        e.preventDefault();
        cardYes();
    } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        cardNo();
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();

        italianFirst = false;
        updateModeIndicator();
        showCard();
        
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();

        italianFirst = true;
        updateModeIndicator();
        showCard();
    }
    else if (e.key === ' ') {
        e.preventDefault();
        flipCard();
    }
    else if (e.key === 'Backspace') {
        e.preventDefault();
        undoLastSwipe();
    }
    else if (e.key === 'Escape') {
        e.preventDefault();
        backToMenu();
    }

});



// Initialize
window.addEventListener('DOMContentLoaded', initializeMenu);