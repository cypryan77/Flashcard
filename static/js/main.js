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
    const scoreValue = document.getElementById('score-value');

    let activeDeck = [];
    let currentCard = null;
    let score = 0;
    let timer;
    let timeLeft = 10;
    let questionStartTime;
    let responseTime;
    let selectedChapterIds = []; // <--- FIX: Persist selected chapter IDs here

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

        chapterCheckboxes.innerHTML = '';
        if (selectedBookIds.length === 0) {
            return;
        }

        const allChapters = db.getChapters();
        const chaptersToShow = allChapters.filter(c => selectedBookIds.includes(c.book_id));

        chaptersToShow.forEach(chapter => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = chapter.id;
            // FIX: Check against the persistent list of selected chapters
            if (selectedChapterIds.includes(chapter.id)) {
                checkbox.checked = true;
            }
            label.appendChild(checkbox);
            label.append(` ${chapter.name}`);
            chapterCheckboxes.appendChild(label);
        });
    }

    bookCheckboxes.addEventListener('change', updateChapterList);

    // FIX: Add a single event listener to the container to manage chapter selection state
    chapterCheckboxes.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
            const chapterId = parseInt(e.target.value);
            if (e.target.checked) {
                if (!selectedChapterIds.includes(chapterId)) {
                    selectedChapterIds.push(chapterId);
                }
            } else {
                selectedChapterIds = selectedChapterIds.filter(id => id !== chapterId);
            }
        }
    });

    startGameBtn.addEventListener('click', () => {
        // FIX: Use the persistent list of selected chapters
        if (selectedChapterIds.length === 0) {
            alert('Please select at least one chapter.');
            return;
        }

        const allCards = db.getCards();
        const selectedCards = allCards.filter(card => !card.suspended && card.chapters.some(ch_id => selectedChapterIds.includes(ch_id)));

        // Filter for unmastered cards
        activeDeck = selectedCards.filter(card => {
            const progress = db.getCardProgress(card.id);
            return progress.consecutive_correct_count < 3;
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

        const totalWeight = activeDeck.reduce((sum, card) => {
            return sum + db.getCardProgress(card.id).weight;
        }, 0);

        let randomWeight = Math.random() * totalWeight;

        for (const card of activeDeck) {
            randomWeight -= db.getCardProgress(card.id).weight;
            if (randomWeight <= 0) {
                currentCard = card;
                displayCard(currentCard);
                return;
            }
        }
        // Fallback in case of floating point inaccuracies
        currentCard = activeDeck[activeDeck.length - 1];
        displayCard(currentCard);
    }

    function displayCard(card) {
        // Reset card state before populating content
        cardElement.classList.remove('flipped');

        // Sanitize content before inserting as HTML to prevent XSS
        const sanitize = (text) => {
            const temp = document.createElement('div');
            temp.textContent = text;
            return temp.innerHTML;
        };

        cardFront.innerHTML = `<div class="card-content">${sanitize(card.question)}</div>`;
        cardBack.innerHTML = `<div class="card-content">${sanitize(card.answer)}</div>`;
        showAnswerBtn.style.display = 'inline-block';
        correctBtn.style.display = 'none';
        incorrectBtn.style.display = 'none';
        suspendBtn.style.display = 'none';
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
    }

    showAnswerBtn.addEventListener('click', showAnswer);

    suspendBtn.addEventListener('click', () => {
        db.updateCard(currentCard.id, { suspended: true });
        // Remove from active deck and select next card
        activeDeck = activeDeck.filter(card => card.id !== currentCard.id);
        selectNextCard();
    });

    function handleAnswer(isCorrect) {
        const progress = db.recordProgress(currentCard.id, isCorrect, responseTime);

        if (isCorrect) {
            // Update session score
            score += (responseTime <= 10000) ? 10 : 5;
            updateScore();

            // If card is mastered, remove it from the active deck
            if (progress.consecutive_correct_count >= 3) {
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
        alert(`Game over! Your score is ${score}`);
    }

    loadBooks();
});
