require('dotenv').config();  // Loads env vars from .env for local use

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const path = require('path');
const config = require('./_config');  // Loads your config

// Define routes
let index = require('./routes/index');
let image = require('./routes/image');

// Connecting the database
const env = process.env.NODE_ENV || 'development';  // Defaults to 'development' locally
const mongoURI = config.mongoURI[env];  // Picks the right URI and inserts password
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true });

// Test connection
let db = mongoose.connection;
db.once('open', () => {
    console.log('Database connected successfully');
});
db.on('error', (err) => {
    console.error('Database connection error:', err);
});

// Initializing the app
const app = express();

// View Engine
app.set('view engine', 'ejs');

// Set up the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Body parser middleware
app.use(express.json());

app.use('/', index);
app.use('/image', image);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is listening at http://localhost:${PORT}`);
});