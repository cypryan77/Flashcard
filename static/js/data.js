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

    createChapter: (name, bookId) => {
        const data = db.getData();
        const newChapter = { id: db.generateId(data), name: name, book_id: bookId, cards: [] };
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

    createCard: (cardData) => {
        const data = db.getData();
        const newCard = {
            id: db.generateId(data),
            front: cardData.front, // { text, image }
            back: cardData.back,   // { text, image }
            chapters: cardData.chapterIds,
            suspended: false,
            is_important: false
        };
        data.cards.push(newCard);

        cardData.chapterIds.forEach(chId => {
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

    toggleImportantStatus: (cardId) => {
        const data = db.getData();
        const card = data.cards.find(c => c.id === cardId);
        if (card) {
            // Ensure is_important property exists
            card.is_important = !card.is_important;

            // Boost weight if it's now important
            if (card.is_important) {
                const progress = db.getCardProgress(cardId);
                progress.weight += 20; // Add a significant weight boost
                data.progress[cardId] = progress;
            }
            // If unmarked, weight will naturally decrease with correct answers.

            db.saveData(data);
            return card;
        }
        return null;
    },

    getCardProgress: (cardId) => {
        const data = db.getData();
        const DEFAULTS = {
            correct_count: 0,
            incorrect_count: 0,
            score: 0,
            consecutive_correct_count: 0,
            weight: 10
        };
        if (!data.progress[cardId]) {
            data.progress[cardId] = { ...DEFAULTS };
            db.saveData(data);
        }
        return { ...DEFAULTS, ...data.progress[cardId] };
    },

    recordProgress: (cardId, isCorrect, responseTimeMs) => {
        const data = db.getData();
        const DEFAULTS = {
            correct_count: 0,
            incorrect_count: 0,
            score: 0,
            consecutive_correct_count: 0,
            weight: 10, // Higher weight = more likely to appear
            last_seen_at: null
        };

        if (!data.progress[cardId]) {
            data.progress[cardId] = { ...DEFAULTS };
        }

        // Ensure old cards have new fields
        const progress = { ...DEFAULTS, ...data.progress[cardId] };

        progress.last_response_time_ms = responseTimeMs;
        progress.last_seen_at = new Date().toISOString();

        if (isCorrect) {
            progress.correct_count++;
            progress.consecutive_correct_count++;
            // Decrease weight, but not below 1
            progress.weight = Math.max(1, progress.weight - 2);
            // Add points based on time
            progress.score += (responseTimeMs <= 10000) ? 10 : 5;
        } else {
            progress.incorrect_count++;
            // Reset consecutive count and weight
            progress.consecutive_correct_count = 0;
            progress.weight = DEFAULTS.weight;
        }

        data.progress[cardId] = progress;
        db.saveData(data);
        return progress;
    },

    deleteCards: (cardIds) => {
        const data = db.getData();
        // Remove cards from the main cards array
        data.cards = data.cards.filter(card => !cardIds.includes(card.id));
        // Remove card references from chapters
        data.chapters.forEach(chapter => {
            chapter.cards = chapter.cards.filter(cardId => !cardIds.includes(cardId));
        });
        // Remove progress data
        cardIds.forEach(cardId => {
            delete data.progress[cardId];
        });
        db.saveData(data);
    },

    moveCards: (cardIds, newChapterIds) => {
        const data = db.getData();
        // First, remove card references from all old chapters
        data.chapters.forEach(chapter => {
            chapter.cards = chapter.cards.filter(cardId => !cardIds.includes(cardId));
        });
        // Then, update the card's chapter list and add references to new chapters
        cardIds.forEach(cardId => {
            const card = data.cards.find(c => c.id === cardId);
            if (card) {
                card.chapters = newChapterIds;
                newChapterIds.forEach(chId => {
                    const chapter = data.chapters.find(c => c.id === chId);
                    if (chapter && !chapter.cards.includes(cardId)) {
                        chapter.cards.push(cardId);
                    }
                });
            }
        });
        db.saveData(data);
    }
};

// Initialize the database on first load
db.getData();
