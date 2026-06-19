const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/config');

// Signup page
router.get('/signup', (req, res) => {
    res.render('signup', { error: null });
});

// Handle signup
router.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
            [username, email, hashedPassword]
        );
        res.redirect('/auth/login');
    } catch (err) {
        console.error(err);
        res.render('signup', { error: 'Username or email already exists' });
    }
});

// Login page
router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

// Handle login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password_hash)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            res.redirect('/books');
        } else {
            res.render('login', { error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Handle logout
router.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/books');
        }
        res.clearCookie('sid');
        res.redirect('/auth/login');
    });
});

module.exports = router;
