document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const bookCheckboxes = document.getElementById('book-checkboxes');
    const chapterCheckboxes = document.getElementById('chapter-checkboxes');
    const startGameBtn = document.getElementById('start-game');
    const gameSection = document.getElementById('game-section');
    const filterSection = document.getElementById('filter-section');
    const timerDisplay = document.getElementById('time');
    const cardContainer = document.getElementById('card-container');
    const cardElement = document.getElementById('card');
    const cardFront = document.querySelector('#card .front');
    const cardBack = document.querySelector('#card .back');
    const showAnswerBtn = document.getElementById('show-answer');
    const correctBtn = document.getElementById('correct-btn');
    const incorrectBtn = document.getElementById('incorrect-btn');
    const suspendBtn = document.getElementById('suspend-btn');
    const importantBtn = document.getElementById('important-btn');
    const scoreValue = document.getElementById('score-value');
    const reviewSection = document.getElementById('review-section');
    const incorrectThresholdInput = document.getElementById('incorrect-threshold');
    const reviewDaysInput = document.getElementById('review-days');
    const startReviewBtn = document.getElementById('start-review-btn');
    const settingsSection = document.getElementById('settings-section');
    const timerDurationInput = document.getElementById('timer-duration');
    const timerDisableCheckbox = document.getElementById('timer-disable');

    // --- Game State ---
    let activeDeck = [];
    let currentCard = null;
    let score = 0;
    let timer;
    let gameSettings = {
        timerDuration: 10,
        isTimerDisabled: false
    };
    let questionStartTime;
    let responseTime;

    const motivationalQuotes = [
        "The only place where success comes before work is in the dictionary. – Vidal Sassoon",
        "I'm a great believer in luck, and I find the harder I work, the more I have of it. – Thomas Jefferson",
        "Hard work beats talent when talent doesn't work hard. – Tim Notke",
        "Opportunities are usually disguised as hard work, so most people don't recognize them. – Ann Landers",
        "There is no substitute for hard work. – Thomas Edison",
        "Great things come from hard work and perseverance. No excuses. – Kobe Bryant",
        "Work hard in silence, let success make the noise. – Frank Ocean",
        "Dreams don't work unless you do. – John C. Maxwell",
        "The hard work definitely paid off and hard work always does. – Gabby Douglas",
        "Chop your own wood and it will warm you twice. – Henry Ford"
    ];

    // --- Book/Chapter Loading ---
    function loadBooks() {
        const books = db.getBooks();
        bookCheckboxes.innerHTML = '';
        books.forEach(book => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = book.id;
            checkbox.classList.add('book-checkbox');
            label.appendChild(checkbox);
            label.append(` ${book.name}`);
            bookCheckboxes.appendChild(label);
        });
    }

    function updateChapterList() {
        const selectedBookIds = Array.from(bookCheckboxes.querySelectorAll('.book-checkbox:checked')).map(cb => parseInt(cb.value));
        const previouslySelectedChapterIds = Array.from(chapterCheckboxes.querySelectorAll('input:checked')).map(cb => parseInt(cb.value));
        chapterCheckboxes.innerHTML = '';
        if (selectedBookIds.length === 0) return;
        const allChapters = db.getChapters();
        const chaptersToShow = allChapters.filter(c => selectedBookIds.includes(c.book_id));
        chaptersToShow.forEach(chapter => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = chapter.id;
            if (previouslySelectedChapterIds.includes(chapter.id)) checkbox.checked = true;
            label.appendChild(checkbox);
            label.append(` ${chapter.name}`);
            chapterCheckboxes.appendChild(label);
        });
    }

    // --- Game Start Logic ---
    function startGame(deck) {
        activeDeck = deck;
        if (activeDeck.length === 0) {
            alert('No cards to study based on your selection.');
            return;
        }

        // Read timer settings
        gameSettings.isTimerDisabled = timerDisableCheckbox.checked;
        gameSettings.timerDuration = parseInt(timerDurationInput.value, 10);

        // Hide setup and show game
        filterSection.style.display = 'none';
        reviewSection.style.display = 'none';
        settingsSection.style.display = 'none';
        gameSection.style.display = 'block';

        score = 0;
        updateScore();
        selectNextCard();
    }

    startGameBtn.addEventListener('click', () => {
        const selectedChapterIds = Array.from(chapterCheckboxes.querySelectorAll('input:checked')).map(cb => parseInt(cb.value));
        if (selectedChapterIds.length === 0) {
            alert('Please select at least one chapter.');
            return;
        }
        const allCards = db.getCards();
        const selectedCards = allCards.filter(card => !card.suspended && card.chapters.some(ch_id => selectedChapterIds.includes(ch_id)));
        const deck = selectedCards.filter(card => {
            const isImportant = card.is_important || false;
            const progress = db.getCardProgress(card.id);
            const masteryGoal = isImportant ? 6 : 3;
            return progress.consecutive_correct_count < masteryGoal;
        });
        startGame(deck);
    });

    startReviewBtn.addEventListener('click', () => {
        const threshold = parseInt(incorrectThresholdInput.value);
        const days = parseInt(reviewDaysInput.value);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const allCards = db.getCards();
        const deck = allCards.filter(card => {
            const progress = db.getCardProgress(card.id);
            const lastSeen = progress.last_seen_at ? new Date(progress.last_seen_at) : null;
            return !card.suspended && progress.incorrect_count >= threshold && lastSeen && lastSeen > cutoffDate;
        });
        startGame(deck);
    });

    // --- Core Game Loop ---
    function selectNextCard() {
        if (activeDeck.length === 0) {
            endGame();
            return;
        }
        const totalWeight = activeDeck.reduce((sum, card) => sum + db.getCardProgress(card.id).weight, 0);
        let randomWeight = Math.random() * totalWeight;
        for (const card of activeDeck) {
            randomWeight -= db.getCardProgress(card.id).weight;
            if (randomWeight <= 0) {
                currentCard = card;
                displayCard(currentCard);
                return;
            }
        }
        currentCard = activeDeck[activeDeck.length - 1];
        displayCard(currentCard);
    }

    function displayCard(card) {
        cardElement.classList.remove('flipped');

        // Helper function to render a card side
        const renderSide = (element, sideData) => {
            element.innerHTML = ''; // Clear previous content
            const contentWrapper = document.createElement('div');
            contentWrapper.className = 'card-content';

            if (sideData.image) {
                const img = document.createElement('img');
                img.src = sideData.image;
                img.style.maxWidth = '100%';
                img.style.maxHeight = '80%';
                contentWrapper.appendChild(img);
            }
            if (sideData.text) {
                const textDiv = document.createElement('div');
                textDiv.textContent = sideData.text;
                textDiv.style.marginTop = sideData.image ? '1rem' : '0';
                contentWrapper.appendChild(textDiv);
            }
            element.appendChild(contentWrapper);
        };

        renderSide(cardFront, card.front);
        renderSide(cardBack, card.back);

        importantBtn.textContent = card.is_important ? 'Unmark as Important' : 'Mark as Important';
        importantBtn.style.backgroundColor = card.is_important ? '#F59E0B' : '';
        showAnswerBtn.style.display = 'inline-block';
        correctBtn.style.display = 'none';
        incorrectBtn.style.display = 'none';
        suspendBtn.style.display = 'none';
        importantBtn.style.display = 'none';
        startTimer();
        questionStartTime = Date.now();
    }

    function startTimer() {
        clearInterval(timer);
        if (gameSettings.isTimerDisabled) {
            timerDisplay.parentElement.style.display = 'none';
            return;
        }
        timerDisplay.parentElement.style.display = 'block';
        let timeLeft = gameSettings.timerDuration;
        timerDisplay.textContent = timeLeft;
        timer = setInterval(() => {
            timeLeft--;
            timerDisplay.textContent = timeLeft;
            if (timeLeft <= 0) {
                clearInterval(timer);
                showAnswer();
            }
        }, 1000);
    }

    function showAnswer() {
        responseTime = Date.now() - questionStartTime;
        clearInterval(timer);
        cardElement.classList.add('flipped');
        showAnswerBtn.style.display = 'none';
        correctBtn.style.display = 'inline-block';
        incorrectBtn.style.display = 'inline-block';
        suspendBtn.style.display = 'inline-block';
        importantBtn.style.display = 'inline-block';
    }

    function handleAnswer(isCorrect) {
        const progress = db.recordProgress(currentCard.id, isCorrect, responseTime);
        if (isCorrect) {
            score += (responseTime <= 10000) ? 10 : 5;
            updateScore();
            const masteryGoal = currentCard.is_important ? 6 : 3;
            if (progress.consecutive_correct_count >= masteryGoal) {
                activeDeck = activeDeck.filter(card => card.id !== currentCard.id);
            }
        }
        selectNextCard();
    }

    function endGame() {
        gameSection.style.display = 'none';
        filterSection.style.display = 'block';
        reviewSection.style.display = 'block';
        settingsSection.style.display = 'block';

        const randomQuote = motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
        alert(`Game over! Your score is ${score}\n\n"${randomQuote}"`);
    }

    // --- Event Listeners ---
    bookCheckboxes.addEventListener('change', updateChapterList);
    showAnswerBtn.addEventListener('click', showAnswer);
    correctBtn.addEventListener('click', () => handleAnswer(true));
    incorrectBtn.addEventListener('click', () => handleAnswer(false));

    suspendBtn.addEventListener('click', () => {
        db.updateCard(currentCard.id, { suspended: true });
        activeDeck = activeDeck.filter(card => card.id !== currentCard.id);
        selectNextCard();
    });

    importantBtn.addEventListener('click', () => {
        const updatedCard = db.toggleImportantStatus(currentCard.id);
        if (updatedCard) {
            currentCard.is_important = updatedCard.is_important;
            importantBtn.textContent = updatedCard.is_important ? 'Unmark as Important' : 'Mark as Important';
            importantBtn.style.backgroundColor = updatedCard.is_important ? '#F59E0B' : '';
            showNotification(`Card marked as ${updatedCard.is_important ? 'important' : 'normal'}.`);
        }
    });

    function updateScore() {
        scoreValue.textContent = score;
    }

    // --- Initial Load ---
    loadBooks();
});
