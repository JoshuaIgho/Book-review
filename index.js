require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const methodOverride = require('method-override');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const pool = require('./db/config');
const bookRoutes = require('./routes/bookRoutes');
const authRoutes = require('./routes/authRoutes');


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// Session configuration
app.use(session({
    store: new pgSession({
        pool: pool,
        tableName: 'session'
    }),
    secret: process.env.SESSION_SECRET || 'fallback_secret',
    resave: false,
    saveUninitialized: false,
    name: 'sid',
    cookie: {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        secure: process.env.NODE_ENV === 'production'
    }
}));

// Global middleware to pass user info to templates
app.use((req, res, next) => {
    res.locals.user = req.session.userId ? { id: req.session.userId, username: req.session.username } : null;
    next();
});

app.set('view engine', 'ejs');
app.use(express.static('public'));

// Redirect root URL to /books
app.get('/', (req, res) => {
    res.redirect('/books');
    
});

// Use routes
app.use('/auth', authRoutes);
app.use('/books', bookRoutes);


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});


