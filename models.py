from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

card_chapter = db.Table('card_chapter',
    db.Column('card_id', db.Integer, db.ForeignKey('card.id'), primary_key=True),
    db.Column('chapter_id', db.Integer, db.ForeignKey('chapter.id'), primary_key=True)
)

class Book(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)
    chapters = db.relationship('Chapter', backref='book', lazy=True)

    def __repr__(self):
        return f'<Book {self.name}>'

class Chapter(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.Integer, nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    cards = db.relationship('Card', secondary=card_chapter, lazy='subquery',
        backref=db.backref('chapters', lazy=True))

    def __repr__(self):
        return f'<Chapter {self.book.name} - {self.number}>'

class Card(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question = db.Column(db.Text, nullable=False)
    answer = db.Column(db.Text, nullable=False)
    suspended = db.Column(db.Boolean, default=False, nullable=False)

    def __repr__(self):
        return f'<Card {self.id}>'

class UserCardProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    card_id = db.Column(db.Integer, db.ForeignKey('card.id'), nullable=False, unique=True) # Assuming one progress per card for now
    last_response_time_ms = db.Column(db.Integer)
    correct_count = db.Column(db.Integer, default=0)
    incorrect_count = db.Column(db.Integer, default=0)
    last_seen_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    score = db.Column(db.Float, default=0)

    card = db.relationship('Card', backref=db.backref('progress', uselist=False, lazy=True))
