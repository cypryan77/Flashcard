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

    const API_URL = '/api';

    function showNotification(message) {
        notification.textContent = message;
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    }

    // Fetch and display all data on page load
    async function loadInitialData() {
        await loadBooks();
        await loadChapters();
        await loadCards();
    }

    // Book functions
    async function loadBooks() {
        const response = await fetch(`${API_URL}/books`);
        const books = await response.json();
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

    bookForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const response = await fetch(`${API_URL}/books`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: bookNameInput.value })
        });
        if (response.ok) {
            bookNameInput.value = '';
            await loadBooks();
            showNotification('Book added successfully!');
        }
    });

    // Chapter functions
    async function loadChapters() {
        const response = await fetch(`${API_URL}/chapters`);
        const chapters = await response.json();
        chapterList.innerHTML = '';
        cardChapterSelect.innerHTML = '';
        chapters.forEach(chapter => {
            const li = document.createElement('li');
            li.textContent = `Chapter ${chapter.number} (Book ID: ${chapter.book_id})`;
            chapterList.appendChild(li);

            const option = document.createElement('option');
            option.value = chapter.id;
            option.textContent = `Chapter ${chapter.number} (Book ID: ${chapter.book_id})`;
            cardChapterSelect.appendChild(option);
        });
    }

    chapterForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const response = await fetch(`${API_URL}/chapters`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                number: parseInt(chapterNumberInput.value),
                book_id: parseInt(chapterBookSelect.value)
            })
        });
        if (response.ok) {
            chapterNumberInput.value = '';
            await loadChapters();
            showNotification('Chapter added successfully!');
        }
    });

    // Card functions
    async function loadCards() {
        const response = await fetch(`${API_URL}/cards`);
        const cards = await response.json();
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

    cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const selectedChapterIds = Array.from(cardChapterSelect.selectedOptions).map(opt => parseInt(opt.value));
        const response = await fetch(`${API_URL}/cards`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: cardQuestionInput.value,
                answer: cardAnswerInput.value,
                chapter_ids: selectedChapterIds
            })
        });
        if (response.ok) {
            cardQuestionInput.value = '';
            cardAnswerInput.value = '';
            await loadCards();
            showNotification('Card added successfully!');
        }
    });

    cardList.addEventListener('click', async (e) => {
        if (e.target.classList.contains('toggle-suspend-btn')) {
            const cardId = e.target.dataset.id;
            const isSuspended = e.target.dataset.suspended === 'true';
            const response = await fetch(`${API_URL}/cards/${cardId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ suspended: !isSuspended })
            });
            if (response.ok) {
                await loadCards();
                showNotification(`Card ${!isSuspended ? 'suspended' : 'unsuspended'}.`);
            }
        }
    });

    loadInitialData();
});
