document.addEventListener('DOMContentLoaded', () => {
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

    // Review session elements
    const reviewSection = document.getElementById('review-section');
    const incorrectThresholdInput = document.getElementById('incorrect-threshold');
    const reviewDaysInput = document.getElementById('review-days');
    const startReviewBtn = document.getElementById('start-review-btn');

    let activeDeck = [];
    let currentCard = null;
    let score = 0;
    let timer;
    let timeLeft = 10;
    let questionStartTime;
    let responseTime;

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
            if (previouslySelectedChapterIds.includes(chapter.id)) {
                checkbox.checked = true;
            }
            label.appendChild(checkbox);
            label.append(` ${chapter.name}`);
            chapterCheckboxes.appendChild(label);
        });
    }

    bookCheckboxes.addEventListener('change', updateChapterList);

    startGameBtn.addEventListener('click', () => {
        const selectedChapterIds = Array.from(chapterCheckboxes.querySelectorAll('input:checked')).map(cb => parseInt(cb.value));
        if (selectedChapterIds.length === 0) {
            alert('Please select at least one chapter.');
            return;
        }
        const allCards = db.getCards();
        const selectedCards = allCards.filter(card => !card.suspended && card.chapters.some(ch_id => selectedChapterIds.includes(ch_id)));

        activeDeck = selectedCards.filter(card => {
            // Ensure is_important exists
            const isImportant = card.is_important || false;
            const progress = db.getCardProgress(card.id);
            const masteryGoal = isImportant ? 6 : 3;
            return progress.consecutive_correct_count < masteryGoal;
        });

        if (activeDeck.length === 0) {
            alert('No cards to study in the selected chapters, or you have already mastered them all!');
            return;
        }

        filterSection.style.display = 'none';
        gameSection.style.display = 'block';
        score = 0;
        updateScore();
        selectNextCard();
    });

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
        const sanitize = (text) => {
            const temp = document.createElement('div');
            temp.textContent = text;
            return temp.innerHTML;
        };
        cardFront.innerHTML = `<div class="card-content">${sanitize(card.question)}</div>`;
        cardBack.innerHTML = `<div class="card-content">${sanitize(card.answer)}</div>`;

        // Update important button text
        importantBtn.textContent = card.is_important ? 'Unmark as Important' : 'Mark as Important';
        importantBtn.style.backgroundColor = card.is_important ? '#F59E0B' : ''; // Amber color if important

        showAnswerBtn.style.display = 'inline-block';
        correctBtn.style.display = 'none';
        incorrectBtn.style.display = 'none';
        suspendBtn.style.display = 'none';
        importantBtn.style.display = 'none';
        startTimer();
        questionStartTime = Date.now();
    }

    function startTimer() {
        timeLeft = 10;
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

    showAnswerBtn.addEventListener('click', showAnswer);

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

    correctBtn.addEventListener('click', () => handleAnswer(true));
    incorrectBtn.addEventListener('click', () => handleAnswer(false));

    function updateScore() {
        scoreValue.textContent = score;
    }

    function endGame() {
        gameSection.style.display = 'none';
        filterSection.style.display = 'block';
        reviewSection.style.display = 'block'; // Show review section again
        alert(`Game over! Your score is ${score}`);
    }

    startReviewBtn.addEventListener('click', () => {
        const threshold = parseInt(incorrectThresholdInput.value);
        const days = parseInt(reviewDaysInput.value);

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const allCards = db.getCards();
        const problemCards = allCards.filter(card => {
            const progress = db.getCardProgress(card.id);
            const lastSeen = progress.last_seen_at ? new Date(progress.last_seen_at) : null;
            return !card.suspended &&
                   progress.incorrect_count >= threshold &&
                   lastSeen && lastSeen > cutoffDate;
        });

        activeDeck = problemCards;

        if (activeDeck.length === 0) {
            alert('No cards match your review criteria.');
            return;
        }

        filterSection.style.display = 'none';
        reviewSection.style.display = 'none';
        gameSection.style.display = 'block';
        score = 0;
        updateScore();
        selectNextCard();
    });

    loadBooks();
});
