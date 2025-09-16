import unittest
import json
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from app import app, db
from models import Book, Chapter, Card, UserCardProgress

class ApiTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app = app.test_client()
        with app.app_context():
            db.create_all()

    def tearDown(self):
        with app.app_context():
            db.session.remove()
            db.drop_all()

    def test_create_and_get_book(self):
        # Create a book
        response = self.app.post('/api/books',
                                 data=json.dumps({'name': 'Test Book'}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Book')
        book_id = data['id']

        # Get the book
        response = self.app.get(f'/api/books/{book_id}')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Book')

    def test_get_all_books(self):
        with app.app_context():
            db.session.add(Book(name='Book 1'))
            db.session.add(Book(name='Book 2'))
            db.session.commit()

        response = self.app.get('/api/books')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)

    def test_update_book(self):
        with app.app_context():
            book = Book(name='Original Name')
            db.session.add(book)
            db.session.commit()
            book_id = book.id

        response = self.app.put(f'/api/books/{book_id}',
                                data=json.dumps({'name': 'Updated Name'}),
                                content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Updated Name')

    def test_delete_book(self):
        with app.app_context():
            book = Book(name='To Be Deleted')
            db.session.add(book)
            db.session.commit()
            book_id = book.id

        response = self.app.delete(f'/api/books/{book_id}')
        self.assertEqual(response.status_code, 200)

        # Verify it's deleted
        response = self.app.get(f'/api/books/{book_id}')
        self.assertEqual(response.status_code, 404)

    def test_create_chapter(self):
        with app.app_context():
            book = Book(name='Test Book')
            db.session.add(book)
            db.session.commit()
            book_id = book.id

        response = self.app.post('/api/chapters',
                                 data=json.dumps({'number': 1, 'book_id': book_id}),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['number'], 1)
        self.assertEqual(data['book_id'], book_id)

    def test_create_card(self):
        with app.app_context():
            book = Book(name='Test Book')
            chapter = Chapter(number=1, book=book)
            db.session.add_all([book, chapter])
            db.session.commit()
            chapter_id = chapter.id

        response = self.app.post('/api/cards',
                                 data=json.dumps({
                                     'question': 'What is testing?',
                                     'answer': 'A good practice.',
                                     'chapter_ids': [chapter_id]
                                 }),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertEqual(data['question'], 'What is testing?')
        self.assertIn(chapter_id, data['chapters'])

    def test_record_progress(self):
        with app.app_context():
            card = Card(question='Q', answer='A')
            db.session.add(card)
            db.session.commit()
            card_id = card.id

        response = self.app.post(f'/api/cards/{card_id}/progress',
                                 data=json.dumps({
                                     'correct': True,
                                     'response_time_ms': 5000
                                 }),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['new_score'], 10)

        with app.app_context():
            progress = UserCardProgress.query.filter_by(card_id=card_id).first()
            self.assertIsNotNone(progress)
            self.assertEqual(progress.score, 10)
            self.assertEqual(progress.correct_count, 1)

if __name__ == '__main__':
    unittest.main()
