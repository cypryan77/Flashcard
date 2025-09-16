from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from models import db, Book, Chapter, Card, UserCardProgress

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///flashcards.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
migrate = Migrate(app, db)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin')
def admin():
    return render_template('admin.html')

# Book endpoints
@app.route('/api/books', methods=['POST'])
def create_book():
    data = request.get_json()
    new_book = Book(name=data['name'])
    db.session.add(new_book)
    db.session.commit()
    return jsonify({'id': new_book.id, 'name': new_book.name}), 201

@app.route('/api/books', methods=['GET'])
def get_books():
    books = Book.query.all()
    return jsonify([{'id': book.id, 'name': book.name} for book in books])

@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = Book.query.get_or_404(book_id)
    return jsonify({'id': book.id, 'name': book.name})

@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    book = Book.query.get_or_404(book_id)
    data = request.get_json()
    book.name = data['name']
    db.session.commit()
    return jsonify({'id': book.id, 'name': book.name})

@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    book = Book.query.get_or_404(book_id)
    db.session.delete(book)
    db.session.commit()
    return jsonify({'message': 'Book deleted'})

# Chapter endpoints
@app.route('/api/chapters', methods=['POST'])
def create_chapter():
    data = request.get_json()
    new_chapter = Chapter(number=data['number'], book_id=data['book_id'])
    db.session.add(new_chapter)
    db.session.commit()
    return jsonify({'id': new_chapter.id, 'number': new_chapter.number, 'book_id': new_chapter.book_id}), 201

@app.route('/api/chapters', methods=['GET'])
def get_chapters():
    chapters = Chapter.query.all()
    return jsonify([{'id': chapter.id, 'number': chapter.number, 'book_id': chapter.book_id} for chapter in chapters])

@app.route('/api/chapters/<int:chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    return jsonify({'id': chapter.id, 'number': chapter.number, 'book_id': chapter.book_id})

@app.route('/api/chapters/<int:chapter_id>', methods=['PUT'])
def update_chapter(chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    data = request.get_json()
    chapter.number = data.get('number', chapter.number)
    chapter.book_id = data.get('book_id', chapter.book_id)
    db.session.commit()
    return jsonify({'id': chapter.id, 'number': chapter.number, 'book_id': chapter.book_id})

@app.route('/api/chapters/<int:chapter_id>', methods=['DELETE'])
def delete_chapter(chapter_id):
    chapter = Chapter.query.get_or_404(chapter_id)
    db.session.delete(chapter)
    db.session.commit()
    return jsonify({'message': 'Chapter deleted'})

# Card endpoints
@app.route('/api/cards', methods=['POST'])
def create_card():
    data = request.get_json()
    new_card = Card(question=data['question'], answer=data['answer'])
    if 'chapter_ids' in data:
        for chapter_id in data['chapter_ids']:
            chapter = Chapter.query.get(chapter_id)
            if chapter:
                new_card.chapters.append(chapter)
    db.session.add(new_card)
    db.session.commit()
    return jsonify({'id': new_card.id, 'question': new_card.question, 'answer': new_card.answer, 'chapters': [c.id for c in new_card.chapters]}), 201

@app.route('/api/cards', methods=['GET'])
def get_cards():
    cards = Card.query.all()
    return jsonify([{'id': card.id, 'question': card.question, 'answer': card.answer, 'suspended': card.suspended, 'chapters': [c.id for c in card.chapters]} for card in cards])

@app.route('/api/cards/<int:card_id>', methods=['GET'])
def get_card(card_id):
    card = Card.query.get_or_404(card_id)
    return jsonify({'id': card.id, 'question': card.question, 'answer': card.answer, 'suspended': card.suspended, 'chapters': [c.id for c in card.chapters]})

@app.route('/api/cards/<int:card_id>', methods=['PUT'])
def update_card(card_id):
    card = Card.query.get_or_404(card_id)
    data = request.get_json()
    card.question = data.get('question', card.question)
    card.answer = data.get('answer', card.answer)
    card.suspended = data.get('suspended', card.suspended)
    if 'chapter_ids' in data:
        card.chapters = []
        for chapter_id in data['chapter_ids']:
            chapter = Chapter.query.get(chapter_id)
            if chapter:
                card.chapters.append(chapter)
    db.session.commit()
    return jsonify({'id': card.id, 'question': card.question, 'answer': card.answer, 'suspended': card.suspended, 'chapters': [c.id for c in card.chapters]})

@app.route('/api/cards/<int:card_id>', methods=['DELETE'])
def delete_card(card_id):
    card = Card.query.get_or_404(card_id)
    db.session.delete(card)
    db.session.commit()
    return jsonify({'message': 'Card deleted'})

@app.route('/api/cards/<int:card_id>/progress', methods=['POST'])
def record_progress(card_id):
    data = request.get_json()
    card = Card.query.get_or_404(card_id)

    progress = card.progress
    if not progress:
        progress = UserCardProgress(card_id=card_id)
        db.session.add(progress)

    progress.last_response_time_ms = data.get('response_time_ms')

    points = 0
    if data.get('correct'):
        if progress.correct_count is None:
            progress.correct_count = 0
        progress.correct_count += 1
        # Full points if within 10s, partial otherwise
        if progress.last_response_time_ms is not None and progress.last_response_time_ms <= 10000:
            points = 10
        else:
            points = 5
    else:
        if progress.incorrect_count is None:
            progress.incorrect_count = 0
        progress.incorrect_count += 1

    if progress.score is None:
        progress.score = 0
    progress.score += points

    db.session.commit()

    return jsonify({'message': 'Progress recorded', 'new_score': progress.score})


if __name__ == '__main__':
    app.run(debug=True)
