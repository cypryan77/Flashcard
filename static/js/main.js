document.addEventListener('DOMContentLoaded', () => {
    const bookSelect = document.getElementById('book-select');
    const chapterCheckboxes = document.getElementById('chapter-checkboxes');
    const startGameBtn = document.getElementById('start-game');
    const gameSection = document.getElementById('game-section');
    const filterSection = document.getElementById('filter-section');

    const timerDisplay = document.getElementById('time');
    const cardContainer = document.getElementById('card-container');
    const cardFront = document.querySelector('#card .front');
    const cardBack = document.querySelector('#card .back');
    const showAnswerBtn = document.getElementById('show-answer');
    const correctBtn = document.getElementById('correct-btn');
    const incorrectBtn = document.getElementById('incorrect-btn');
    const suspendBtn = document.getElementById('suspend-btn');
    const scoreValue = document.getElementById('score-value');

    let cards = [];
    let currentCardIndex = 0;
    let score = 0;
    let timer;
    let timeLeft = 10;
    let questionStartTime;
    let responseTime;

    function loadBooks() {
        const books = db.getBooks();
        bookSelect.innerHTML = '<option value="">Select a book</option>';
        books.forEach(book => {
            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            bookSelect.appendChild(option);
        });
    }

    bookSelect.addEventListener('change', () => {
        const bookId = parseInt(bookSelect.value);
        if (!bookId) {
            chapterCheckboxes.innerHTML = '';
            return;
        }
        const allChapters = db.getChapters();
        const bookChapters = allChapters.filter(c => c.book_id === bookId);

        chapterCheckboxes.innerHTML = '';
        bookChapters.forEach(chapter => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = chapter.id;
            label.appendChild(checkbox);
            label.append(` ${chapter.name}`);
            chapterCheckboxes.appendChild(label);
        });
    });

    startGameBtn.addEventListener('click', () => {
        const selectedChapterIds = Array.from(chapterCheckboxes.querySelectorAll('input:checked')).map(cb => parseInt(cb.value));
        if (selectedChapterIds.length === 0) {
            alert('Please select at least one chapter.');
            return;
        }

        const allCards = db.getCards();
        cards = allCards.filter(card => !card.suspended && card.chapters.some(ch_id => selectedChapterIds.includes(ch_id)));

        if (cards.length === 0) {
            alert('No cards found for the selected chapters.');
            return;
        }

        filterSection.style.display = 'none';
        gameSection.style.display = 'block';
        currentCardIndex = 0;
        score = 0;
        updateScore();
        displayCard();
    });

    function displayCard() {
        if (currentCardIndex >= cards.length) {
            endGame();
            return;
        }
        const card = cards[currentCardIndex];
        cardFront.textContent = card.question;
        cardBack.textContent = card.answer;
        cardContainer.classList.remove('flipped');
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
        cardContainer.classList.add('flipped');
        showAnswerBtn.style.display = 'none';
        correctBtn.style.display = 'inline-block';
        incorrectBtn.style.display = 'inline-block';
        suspendBtn.style.display = 'inline-block';
    }

    showAnswerBtn.addEventListener('click', showAnswer);

    suspendBtn.addEventListener('click', () => {
        const card = cards[currentCardIndex];
        db.updateCard(card.id, { suspended: true });
        cards.splice(currentCardIndex, 1);
        displayCard();
    });

    function handleAnswer(correct) {
        const card = cards[currentCardIndex];
        const progress = db.recordProgress(card.id, correct, responseTime);

        if (correct) {
            if (responseTime <= 10000) {
                score += 10;
            } else {
                score += 5;
            }
        }
        updateScore();
        nextCard();
    }

    correctBtn.addEventListener('click', () => handleAnswer(true));
    incorrectBtn.addEventListener('click', () => handleAnswer(false));

    function nextCard() {
        currentCardIndex++;
        displayCard();
    }

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
