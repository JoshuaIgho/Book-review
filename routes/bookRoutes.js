const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const formatDate = require('../utils/dateFormatter'); // Import the formatter function

// Authentication Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/auth/login');
};

// Multer configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../public/uploads'));
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const fileTypes = /jpeg|jpg|png|gif/;
        const extname = fileTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = fileTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});



// Get all books
router.get('/', isAuthenticated, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books WHERE user_id = $1 ORDER BY read_date DESC', [req.session.userId]);

        // Format the read_date for each book
        const books = result.rows.map(book => ({
            ...book,
            read_date: formatDate(new Date(book.read_date)) // Format the read_date
        }));

        res.render('index', { books });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Add new book form
router.get('/add', isAuthenticated, (req, res) => {
    res.render('add');
});

router.get('/about', (req, res) => {
    res.render('about'); // Render the about.ejs file
});

router.get('/contact', (req, res) => {
    res.render('contact'); // Render the contact.ejs file
});

// Route to get a specific book's review
router.post('/review', isAuthenticated, async (req, res) => {
    const bookId = req.body.bookId; // Get the bookId from the form submission

    try {
        const result = await pool.query('SELECT * FROM books WHERE id = $1 AND user_id = $2', [bookId, req.session.userId]);
        const book = result.rows[0]; // Get the first row

        if (!book) {
            return res.status(404).send('Book not found');
        }

        res.render('review', { book }); // Pass the book object to the view
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Add new book
router.post('/', upload.single('cover_file'), async (req, res) => {
    const { title, author, rating, review, read_date } = req.body;
    let cover_url = '/images/default-cover.jpg';

    if (req.file) {
        cover_url = `/uploads/${req.file.filename}`;
    } else {
        // Fallback to Open Library API if no file uploaded
        cover_url = await fetchCoverUrl(title);
    }

    try {
        await pool.query(
            'INSERT INTO books (title, author, rating, review, cover_url, read_date, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [title, author, rating, review, cover_url, read_date, req.session.userId]
        );
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
    

// Fetch cover URL from Open Library API
const fetchCoverUrl = async (title) => {
    try {
        const response = await axios.get(`https://covers.openlibrary.org/b/olid/${title}.json`);
        return response.data.cover_url || '/images/default-cover.jpg'; // Fallback to a default cover
    } catch (error) {
        console.error('Error fetching cover:', error.message);
        return '/images/default-cover.jpg'; // Fallback if API fails
    }
};


// Edit book form
router.get('/edit/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM books WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
    if (result.rows.length === 0) return res.status(404).send('Book not found');
    res.render('edit', { book: result.rows[0] });
});

// Update book
router.put('/:id', isAuthenticated, upload.single('cover_file'), async (req, res) => {
    const { id } = req.params;
    const { title, author, rating, review, read_date, existing_cover_url } = req.body;
    const cover_url = req.file ? `/uploads/${req.file.filename}` : existing_cover_url;

    try {
        const check = await pool.query('SELECT * FROM books WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
        if (check.rows.length === 0) return res.status(403).send('Unauthorized');

        await pool.query(
            'UPDATE books SET title = $1, author = $2, rating = $3, review = $4, cover_url = $5, read_date = $6 WHERE id = $7',
            [title, author, rating, review, cover_url, read_date, id]
        );
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});




// Delete book
router.delete('/:id', isAuthenticated, async (req, res) => {
    const { id } = req.params;
    try {
        const check = await pool.query('SELECT * FROM books WHERE id = $1 AND user_id = $2', [id, req.session.userId]);
        if (check.rows.length === 0) return res.status(403).send('Unauthorized');

        await pool.query('DELETE FROM books WHERE id = $1', [id]);
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;


