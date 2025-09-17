document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const bookForm = document.getElementById('book-form');
    const bookNameInput = document.getElementById('book-name');
    const bookList = document.getElementById('book-list');
    const chapterForm = document.getElementById('chapter-form');
    const chapterBookSelect = document.getElementById('chapter-book-select');
    const chapterNameInput = document.getElementById('chapter-name');
    const chapterList = document.getElementById('chapter-list');
    const cardForm = document.getElementById('card-form');
    const cardChapterSelect = document.getElementById('card-chapter-select');
    const cardList = document.getElementById('card-list');
    const notification = document.getElementById('notification');
    const selectAllCardsCheckbox = document.getElementById('select-all-cards');
    const bulkActionsPanel = document.getElementById('bulk-actions');
    const bulkDeleteBtn = document.getElementById('bulk-delete-btn');
    const bulkMoveChapterSelect = document.getElementById('bulk-move-chapter-select');
    const bulkMoveBtn = document.getElementById('bulk-move-btn');
    const csvImportInput = document.getElementById('csv-import-input');
    const importCsvBtn = document.getElementById('import-csv-btn');

    // New Card Form Elements
    const cardFrontTextInput = document.getElementById('card-front-text');
    const cardFrontImageInput = document.getElementById('card-front-image');
    const frontImagePreview = document.getElementById('front-image-preview');
    const cardBackTextInput = document.getElementById('card-back-text');
    const cardBackImageInput = document.getElementById('card-back-image');
    const backImagePreview = document.getElementById('back-image-preview');

    // --- Utility Functions ---
    function showNotification(message) {
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }

    // --- Initial Load ---
    function loadInitialData() {
        loadBooks();
        loadChapters();
        loadCards();
        updateBulkActionsPanel();
    }

    // --- Book & Chapter Logic (Unchanged) ---
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
    function loadChapters() {
        const chapters = db.getChapters();
        const books = db.getBooks();
        chapterList.innerHTML = '';
        cardChapterSelect.innerHTML = '';
        bulkMoveChapterSelect.innerHTML = '';
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

    // --- Card Management Logic ---
    function loadCards() {
        const cards = db.getCards();
        cardList.innerHTML = '';
        cards.forEach(card => {
            const li = document.createElement('li');
            const questionText = card.front.text || (card.front.image ? '[Image]' : '[Empty]');
            li.innerHTML = `
                <input type="checkbox" class="card-checkbox" data-id="${card.id}">
                <span>Q: ${questionText} ${card.suspended ? '(Suspended)' : ''}</span>
                <button class="toggle-suspend-btn" data-id="${card.id}" data-suspended="${card.suspended}">
                    ${card.suspended ? 'Unsuspend' : 'Suspend'}
                </button>
            `;
            cardList.appendChild(li);
        });
        updateBulkActionsPanel();
    }

    // New Image Card Creation Logic
    function handleImagePreview(fileInput, previewElement) {
        if (fileInput.files && fileInput.files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                previewElement.src = e.target.result;
                previewElement.style.display = 'block';
            };
            reader.readAsDataURL(fileInput.files[0]);
        } else {
            previewElement.src = '';
            previewElement.style.display = 'none';
        }
    }
    cardFrontImageInput.addEventListener('change', () => handleImagePreview(cardFrontImageInput, frontImagePreview));
    cardBackImageInput.addEventListener('change', () => handleImagePreview(cardBackImageInput, backImagePreview));

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            if (!file) {
                resolve(null);
                return;
            }
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    cardForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // At least one text or image must be provided for the front
        if (!cardFrontTextInput.value && !cardFrontImageInput.files[0]) {
            alert('A card must have either text or an image on the front.');
            return;
        }

        const [frontImage, backImage] = await Promise.all([
            readFileAsDataURL(cardFrontImageInput.files[0]),
            readFileAsDataURL(cardBackImageInput.files[0])
        ]);

        const cardData = {
            front: {
                text: cardFrontTextInput.value,
                image: frontImage
            },
            back: {
                text: cardBackTextInput.value,
                image: backImage
            },
            chapterIds: Array.from(cardChapterSelect.selectedOptions).map(opt => parseInt(opt.value))
        };

        db.createCard(cardData);

        // Reset form
        cardForm.reset();
        frontImagePreview.src = '';
        frontImagePreview.style.display = 'none';
        backImagePreview.src = '';
        backImagePreview.style.display = 'none';

        loadCards();
        showNotification('Card added successfully!');
    });

    // --- Bulk Actions & CSV (Unchanged) ---
    function getSelectedCardIds() {
        return Array.from(cardList.querySelectorAll('.card-checkbox:checked')).map(cb => parseInt(cb.dataset.id));
    }
    function updateBulkActionsPanel() {
        const selectedIds = getSelectedCardIds();
        bulkActionsPanel.classList.toggle('d-none', selectedIds.length === 0);
    }
    selectAllCardsCheckbox.addEventListener('change', (e) => {
        cardList.querySelectorAll('.card-checkbox').forEach(checkbox => checkbox.checked = e.target.checked);
        updateBulkActionsPanel();
    });
    cardList.addEventListener('click', (e) => {
        if (e.target.classList.contains('toggle-suspend-btn')) {
            const cardId = parseInt(e.target.dataset.id);
            const isSuspended = e.target.dataset.suspended === 'true';
            db.updateCard(cardId, { suspended: !isSuspended });
            loadCards();
            showNotification(`Card ${!isSuspended ? 'suspended' : 'unsuspended'}.`);
        }
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
    function parseCSV(text) {
        const rows = text.trim().split('\n');
        return rows.map(row => {
            const result = [];
            let current = '', inQuotes = false;
            for (const char of row) {
                if (char === '"') inQuotes = !inQuotes;
                else if (char === ',' && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else current += char;
            }
            result.push(current.trim());
            return result;
        });
    }
    importCsvBtn.addEventListener('click', async () => {
        const file = csvImportInput.files[0];
        if (!file) return alert('Please select a CSV file.');
        const text = await file.text();
        const data = parseCSV(text);
        let importedCount = 0;
        data.forEach(row => {
            if (row.length !== 4) return;
            const [question, answer, chaptersStr, bookName] = row;
            let books = db.getBooks();
            let book = books.find(b => b.name === bookName) || db.createBook(bookName);
            const chapterNames = chaptersStr.split(',').map(c => c.trim());
            const chapterIds = chapterNames.map(chName => {
                let chapters = db.getChapters();
                return (chapters.find(c => c.name === chName && c.book_id === book.id) || db.createChapter(chName, book.id)).id;
            });
            db.createCard({
                front: { text: question, image: null },
                back: { text: answer, image: null },
                chapterIds: chapterIds
            });
            importedCount++;
        });
        loadInitialData();
        showNotification(`Successfully imported ${importedCount} card(s).`);
    });

    // --- Initial Load ---
    loadInitialData();
});
