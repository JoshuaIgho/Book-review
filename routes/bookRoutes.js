const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const axios = require('axios');
const multer = require('multer');
const path = require('path');
const formatDate = require('../utils/dateFormatter'); // Import the formatter function


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
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM books ORDER BY read_date DESC');

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
router.get('/add', (req, res) => {
    res.render('add');
    
});

router.get('/about', (req, res) => {
    res.render('about'); // Render the about.ejs file
});

router.get('/contact', (req, res) => {
    res.render('contact'); // Render the contact.ejs file
});

// Route to get a specific book's review
router.post('/review', async (req, res) => {
    const bookId = req.body.bookId; // Get the bookId from the form submission

    try {
        const result = await pool.query('SELECT * FROM books WHERE id = $1', [bookId]);
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
    const cover_url = req.file ? `/uploads/${req.file.filename}` : '/images/default-cover.jpg';

    try {
        await pool.query(
            'INSERT INTO books (title, author, rating, review, cover_url, read_date) VALUES ($1, $2, $3, $4, $5, $6)',
            [title, author, rating, review, cover_url, read_date]
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
router.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM books WHERE id = $1', [id]);
    res.render('edit', { book: result.rows[0] });
});

// Update book
router.post('/edit/:id', upload.single('cover_file'), async (req, res) => {
    const { id } = req.params;
    const { title, author, rating, review, read_date } = req.body;
    // const cover_url = req.file ? `/uploads/${req.file.filename}` : req.body.existing_cover_url;
    const cover_url = req.file ? `/uploads/${req.file.filename}` : '/images/default-cover.jpg';

    try {
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
router.get('/delete/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM books WHERE id = $1', [id]);
        res.redirect('/books');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

module.exports = router;


