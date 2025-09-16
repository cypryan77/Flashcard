document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const bookFilterContainer = document.getElementById('book-filter-checkboxes');
    const chapterFilterContainer = document.getElementById('chapter-filter-checkboxes');
    const applyFiltersBtn = document.getElementById('apply-filters-btn');
    const questionsTableBody = document.querySelector('#questions-table tbody');

    // --- Populating Filters ---

    function populateFilters() {
        const books = db.getBooks();
        const chapters = db.getChapters();

        // Populate books
        bookFilterContainer.innerHTML = '';
        books.forEach(book => {
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = book.id;
            checkbox.classList.add('book-filter-cb');
            label.appendChild(checkbox);
            label.append(` ${book.name}`);
            bookFilterContainer.appendChild(label);
        });

        // Populate chapters
        chapterFilterContainer.innerHTML = '';
        chapters.forEach(chapter => {
            const book = books.find(b => b.id === chapter.book_id);
            const label = document.createElement('label');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = chapter.id;
            checkbox.classList.add('chapter-filter-cb');
            label.appendChild(checkbox);
            label.append(` ${chapter.name} (${book ? book.name : '...'})`);
            chapterFilterContainer.appendChild(label);
        });
    }

    // --- Rendering the Table ---

    function renderTable(cardsToRender) {
        questionsTableBody.innerHTML = '';
        if (cardsToRender.length === 0) {
            const row = questionsTableBody.insertRow();
            const cell = row.insertCell();
            cell.colSpan = 8;
            cell.textContent = 'No questions match the current filters.';
            cell.style.textAlign = 'center';
            return;
        }

        const allChapters = db.getChapters();

        cardsToRender.forEach(card => {
            const progress = db.getCardProgress(card.id);
            const row = questionsTableBody.insertRow();

            // Map chapter IDs to names
            const chapterNames = card.chapters
                .map(chId => allChapters.find(c => c.id === chId)?.name)
                .filter(Boolean)
                .join(', ');

            row.insertCell().textContent = card.question;
            row.insertCell().textContent = card.answer;
            row.insertCell().textContent = chapterNames;
            row.insertCell().textContent = progress.correct_count;
            row.insertCell().textContent = progress.incorrect_count;
            row.insertCell().textContent = progress.consecutive_correct_count;
            row.insertCell().textContent = progress.weight;
            row.insertCell().textContent = card.suspended ? 'Yes' : 'No';
        });
    }

    // --- Filtering Logic ---

    function applyFilters() {
        const allCards = db.getCards();
        const selectedBookIds = Array.from(bookFilterContainer.querySelectorAll('.book-filter-cb:checked')).map(cb => parseInt(cb.value));
        const selectedChapterIds = Array.from(chapterFilterContainer.querySelectorAll('.chapter-filter-cb:checked')).map(cb => parseInt(cb.value));

        let filteredCards = allCards;

        // Apply book filter
        if (selectedBookIds.length > 0) {
            const chaptersInSelectedBooks = db.getChapters()
                .filter(ch => selectedBookIds.includes(ch.book_id))
                .map(ch => ch.id);

            filteredCards = filteredCards.filter(card =>
                card.chapters.some(chId => chaptersInSelectedBooks.includes(chId))
            );
        }

        // Apply chapter filter
        if (selectedChapterIds.length > 0) {
            filteredCards = filteredCards.filter(card =>
                card.chapters.some(chId => selectedChapterIds.includes(chId))
            );
        }

        renderTable(filteredCards);
    }

    // --- Initial Load ---

    applyFiltersBtn.addEventListener('click', applyFilters);

    populateFilters();
    applyFilters(); // Show all cards on initial load
});
