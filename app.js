const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const bodyParser = require("body-parser");
const cors = require("cors");
const jwt = require('jsonwebtoken');

require('dotenv').config()

const usersRouter = require('./routes/users');
const itemsRouter = require('./routes/items');
const charactersRouter = require('./routes/characters');

const app = express();

app.use(cors())
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// parse requests of content-type - application/json
app.use(bodyParser.json());

app.use((req, res, next) => {
	const token = req.headers.authorization;
	if (!token || token.split(' ')[1] == 'undefined') return next();
	jwt.verify(token.split(' ')[1], process.env.JWT_SECRET, (err, decoded) => {
		if (err) return res.status(401).json({ message: 'Token expired' });
		req.decoded = decoded;
		next();
	});
});

app.use('/users', usersRouter);
app.use('/items', itemsRouter);
app.use('/characters', charactersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    let message = err.message;
    let error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.send({ message: message, error: error });
});

module.exports = app;
