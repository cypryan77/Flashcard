document.addEventListener('DOMContentLoaded', () => {
    // Existing elements
    const bookForm = document.getElementById('book-form');
    const bookNameInput = document.getElementById('book-name');
    const bookList = document.getElementById('book-list');
    const chapterForm = document.getElementById('chapter-form');
    const chapterBookSelect = document.getElementById('chapter-book-select');
    const chapterNameInput = document.getElementById('chapter-name');
    const chapterList = document.getElementById('chapter-list');
    const cardForm = document.getElementById('card-form');
    const cardQuestionInput = document.getElementById('card-question');
    const cardAnswerInput = document.getElementById('card-answer');
    const cardChapterSelect = document.getElementById('card-chapter-select');
    const cardList = document.getElementById('card-list');
    const notification = document.getElementById('notification');

    // New bulk action elements
    const selectAllCardsCheckbox = document.getElementById('select-all-cards');
    const bulkActionsPanel = document.getElementById('bulk-actions');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const bulkMoveChapterSelect = document.getElementById('bulk-move-chapter-select');
    const bulkMoveBtn = document.getElementById('bulk-move-btn');

    // CSV Import elements
    const csvImportInput = document.getElementById('csv-import-input');
    const importCsvBtn = document.getElementById('import-csv-btn');


    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    function loadInitialData() {
        loadBooks();
        loadChapters();
        loadCards();
        updateBulkActionsPanel();
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
        bulkMoveChapterSelect.innerHTML = ''; // Populate bulk move dropdown
        chapters.forEach(chapter => {
            const book = books.find(b => b.id === chapter.book_id);
            const text = `${chapter.name} (${book ? book.name : 'Unknown Book'})`;

            const li = document.createElement('li');
            li.textContent = text;
            chapterList.appendChild(li);

            const option1 = document.createElement('option');
            option1.value = chapter.id;
            option1.textContent = text;
            cardChapterSelect.appendChild(option1);

            const option2 = document.createElement('option');
            option2.value = chapter.id;
            option2.textContent = text;
            bulkMoveChapterSelect.appendChild(option2);
        });
    }

    chapterForm.addEventListener('submit', (e) => {
        e.preventDefault();
        db.createChapter(chapterNameInput.value, parseInt(chapterBookSelect.value));
        chapterNameInput.value = '';
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
                <input type="checkbox" class="card-checkbox" data-id="${card.id}">
                <span>Q: ${card.question} ${card.suspended ? '(Suspended)' : ''}</span>
                <button class="toggle-suspend-btn" data-id="${card.id}" data-suspended="${card.suspended}">
                    ${card.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
            `;
            cardList.appendChild(li);
        });
        updateBulkActionsPanel();
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

    // --- Bulk Actions Logic ---

    function getSelectedCardIds() {
        return Array.from(cardList.querySelectorAll('.card-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
    }

    function updateBulkActionsPanel() {
        const selectedIds = getSelectedCardIds();
        if (selectedIds.length > 0) {
            bulkActionsPanel.classList.remove('d-none');
        } else {
            bulkActionsPanel.classList.add('d-none');
        }
    }

    selectAllCardsCheckbox.addEventListener('change', (e) => {
        cardList.querySelectorAll('.card-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
        updateBulkActionsPanel();
    });

    cardList.addEventListener('click', (e) => {
        // Toggle suspend logic
        if (e.target.classList.contains('toggle-suspend-btn')) {
            const cardId = parseInt(e.target.dataset.id);
            const isSuspended = e.target.dataset.suspended === 'true';
            db.updateCard(cardId, { suspended: !isSuspended });
            loadCards();
            showNotification(`Card ${!isSuspended ? 'suspended' : 'unsuspended'}.`);
        }
        // Checkbox click logic
        if (e.target.classList.contains('card-checkbox')) {
            updateBulkActionsPanel();
        }
    });

    bulkDeleteBtn.addEventListener('click', () => {
        const selectedIds = getSelectedCardIds();
        if (confirm(`Are you sure you want to delete ${selectedIds.length} card(s)?`)) {
            db.deleteCards(selectedIds);
            loadCards();
            showNotification(`${selectedIds.length} card(s) deleted.`);
        }
    });

    bulkMoveBtn.addEventListener('click', () => {
        const cardIds = getSelectedCardIds();
        const chapterIds = Array.from(bulkMoveChapterSelect.selectedOptions).map(opt => parseInt(opt.value));

        if (chapterIds.length === 0) {
            alert('Please select at least one destination chapter.');
            return;
        }

        db.moveCards(cardIds, chapterIds);
        loadCards();
        showNotification(`${cardIds.length} card(s) moved.`);
    });

    // --- CSV Import Logic ---

    // Simple CSV parser that handles quoted fields.
    function parseCSV(text) {
        const rows = text.trim().split('\n');
        return rows.map(row => {
            const result = [];
            let current = '';
            let inQuotes = false;
            for (let i = 0; i < row.length; i++) {
                const char = row[i];
                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }
            result.push(current.trim());
            return result;
        });
    }

    async function handleImport() {
        const file = csvImportInput.files[0];
        if (!file) {
            alert('Please select a CSV file to import.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const data = parseCSV(text);
            let importedCount = 0;

            data.forEach(row => {
                if (row.length !== 4) return; // Skip malformed rows

                const [question, answer, chaptersStr, bookName] = row;

                // Find or create book
                let books = db.getBooks();
                let book = books.find(b => b.name === bookName);
                if (!book) {
                    book = db.createBook(bookName);
                }

                // Find or create chapters
                const chapterNames = chaptersStr.split(',').map(c => c.trim());
                const chapterIds = chapterNames.map(chName => {
                    let chapters = db.getChapters();
                    let chapter = chapters.find(c => c.name === chName && c.book_id === book.id);
                    if (!chapter) {
                        chapter = db.createChapter(chName, book.id);
                    }
                    return chapter.id;
                });

                // Create card
                db.createCard(question, answer, chapterIds);
                importedCount++;
            });

            // Refresh UI
            loadInitialData();
            showNotification(`Successfully imported ${importedCount} card(s).`);
        };
        reader.readAsText(file);
    }

    importCsvBtn.addEventListener('click', handleImport);


    loadInitialData();
});
