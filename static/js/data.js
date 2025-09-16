// Data management module using localStorage

const db = {
    // Fetches all data from localStorage.
    getData: () => {
        const data = localStorage.getItem('flashcardApp');
        if (data) {
            return JSON.parse(data);
        }
        // Initialize if no data found
        const initialData = {
            books: [],
            chapters: [],
            cards: [],
            progress: {}, // by cardId
            nextId: 1
        };
        db.saveData(initialData);
        return initialData;
    },

    // Saves all data to localStorage.
    saveData: (data) => {
        localStorage.setItem('flashcardApp', JSON.stringify(data));
    },

    // Generates a new unique ID.
    generateId: (data) => {
        const id = data.nextId;
        data.nextId++;
        return id;
    },

    // CRUD functions
    createBook: (name) => {
        const data = db.getData();
        const newBook = { id: db.generateId(data), name: name, chapters: [] };
        data.books.push(newBook);
        db.saveData(data);
        return newBook;
    },

    getBooks: () => {
        return db.getData().books;
    },

    createChapter: (number, bookId) => {
        const data = db.getData();
        const newChapter = { id: db.generateId(data), number: number, book_id: bookId, cards: [] };
        data.chapters.push(newChapter);

        const book = data.books.find(b => b.id === bookId);
        if (book) {
            book.chapters.push(newChapter.id);
        }

        db.saveData(data);
        return newChapter;
    },

    getChapters: () => {
        return db.getData().chapters;
    },

    createCard: (question, answer, chapterIds) => {
        const data = db.getData();
        const newCard = {
            id: db.generateId(data),
            question: question,
            answer: answer,
            chapters: chapterIds,
            suspended: false
        };
        data.cards.push(newCard);

        chapterIds.forEach(chId => {
            const chapter = data.chapters.find(c => c.id === chId);
            if (chapter) {
                chapter.cards.push(newCard.id);
            }
        });

        db.saveData(data);
        return newCard;
    },

    getCards: () => {
        return db.getData().cards;
    },

    updateCard: (cardId, updates) => {
        const data = db.getData();
        const card = data.cards.find(c => c.id === cardId);
        if (card) {
            Object.assign(card, updates);
            db.saveData(data);
            return card;
        }
        return null;
    },

    recordProgress: (cardId, correct, responseTimeMs) => {
        const data = db.getData();
        if (!data.progress[cardId]) {
            data.progress[cardId] = {
                correct_count: 0,
                incorrect_count: 0,
                score: 0
            };
        }
        const progress = data.progress[cardId];
        progress.last_response_time_ms = responseTimeMs;

        let points = 0;
        if (correct) {
            progress.correct_count++;
            if (responseTimeMs <= 10000) {
                points = 10;
            } else {
                points = 5;
            }
        } else {
            progress.incorrect_count++;
        }
        progress.score += points;

        db.saveData(data);
        return progress;
    }
};

// Initialize the database on first load
db.getData();
