document.addEventListener('DOMContentLoaded', () => {
    const bookForm = document.getElementById('book-form');
    const bookNameInput = document.getElementById('book-name');
    const bookList = document.getElementById('book-list');

    const chapterForm = document.getElementById('chapter-form');
    const chapterBookSelect = document.getElementById('chapter-book-select');
    const chapterNumberInput = document.getElementById('chapter-number');
    const chapterList = document.getElementById('chapter-list');

    const cardForm = document.getElementById('card-form');
    const cardQuestionInput = document.getElementById('card-question');
    const cardAnswerInput = document.getElementById('card-answer');
    const cardChapterSelect = document.getElementById('card-chapter-select');
    const cardList = document.getElementById('card-list');
    const notification = document.getElementById('notification');

    function showNotification(message) {
        notification.textContent = message;
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    // Load initial data
    function loadInitialData() {
        loadBooks();
        loadChapters();
        loadCards();
    }

    // Book functions
    function loadBooks() {
        const books = db.getBooks();
        bookList.innerHTML = '';
        chapterBookSelect.innerHTML = '';
        books.forEach(book => {
            const li = document.createElement('li');
            li.textContent = book.name;
            bookList.appendChild(li);

            const option = document.createElement('option');
            option.value = book.id;
            option.textContent = book.name;
            chapterBookSelect.appendChild(option);
        });
    }

    bookForm.addEventListener('submit', (e) => {
        e.preventDefault();
        db.createBook(bookNameInput.value);
        bookNameInput.value = '';
        loadBooks();
        showNotification('Book added successfully!');
    });

    // Chapter functions
    function loadChapters() {
        const chapters = db.getChapters();
        const books = db.getBooks();
        chapterList.innerHTML = '';
        cardChapterSelect.innerHTML = '';
        chapters.forEach(chapter => {
            const book = books.find(b => b.id === chapter.book_id);
            const li = document.createElement('li');
            li.textContent = `Chapter ${chapter.number} (${book ? book.name : 'Unknown Book'})`;
            chapterList.appendChild(li);

            const option = document.createElement('option');
            option.value = chapter.id;
            option.textContent = `Chapter ${chapter.number} (${book ? book.name : 'Unknown Book'})`;
            cardChapterSelect.appendChild(option);
        });
    }

    chapterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        db.createChapter(parseInt(chapterNumberInput.value), parseInt(chapterBookSelect.value));
        chapterNumberInput.value = '';
        loadChapters();
        showNotification('Chapter added successfully!');
    });

    // Card functions
    function loadCards() {
        const cards = db.getCards();
        cardList.innerHTML = '';
        cards.forEach(card => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>Q: ${card.question} ${card.suspended ? '(Suspended)' : ''}</span>
                <button class="toggle-suspend-btn" data-id="${card.id}" data-suspended="${card.suspended}">
                    ${card.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
            `;
            cardList.appendChild(li);
        });
    }

    cardForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const selectedChapterIds = Array.from(cardChapterSelect.selectedOptions).map(opt => parseInt(opt.value));
        db.createCard(cardQuestionInput.value, cardAnswerInput.value, selectedChapterIds);
        cardQuestionInput.value = '';
        cardAnswerInput.value = '';
        loadCards();
        showNotification('Card added successfully!');
    });

    cardList.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-suspend-btn')) {
            const cardId = parseInt(e.target.dataset.id);
            const isSuspended = e.target.dataset.suspended === 'true';
            db.updateCard(cardId, { suspended: !isSuspended });
            loadCards();
            showNotification(`Card ${!isSuspended ? 'suspended' : 'unsuspended'}.`);
        }
    });

    loadInitialData();
});
