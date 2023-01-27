const createError = require('http-errors');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
var jwt = require('jsonwebtoken');

const Users = require('../modules/users');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get('/', async function (req, res, next) {
	try {
		// Extract the page and page size from the request query parameters
		const page = req.query.page || 1;
		const pageSize = req.query.pageSize || 10;

		// List the users
		const users = await Users.listUsers(page, pageSize);

		// Respond with the list of users
		res.json(users);
	} catch (error) {
		// Handle any errors
		console.error(error);
		return next(createError(500, 'An error occurred while trying to list the users'));
	}
});


router.get('/id/:id', async function (req, res, next) {
	try {
		// Validate the 'id' route parameter
		if (!uuidRegex.test(req.params.id)) {
			return next(createError(400, "Invalid user id"));
		}

		// Retrieve the user from the database
		const user = await Users.getUser(req.params.id);

		// If no user is found, return a 404 error
		if (!user) {
			return next(createError(404, "User not found"));
		}

		// Respond with the user data as a JSON object
		res.json(user);

	} catch (error) {
		// Handle any other errors
		return next(createError(500, "An error occurred while trying to retrieve the user"));
	}
});


router.patch('/id/:id', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		// Create the user object with the updated properties
		const user = {};
		if (req.body.nickname) {
			user.nickname = req.body.nickname;
		}
		if (req.body.email) {
			user.email = req.body.email;
		}
		if (req.body.password) {
			user.password = await bcrypt.hash(req.body.password, 10);
		}

		// Update the user in the database
		const updatedUser = await Users.updateUser(req.params.id, user);

		// Respond with the updated user data as a JSON object
		res.json(updatedUser);
	} catch (error) {
		// Handle any errors
		if (error.constraint === 'users_nickname_unique') {
			return next(createError(409, 'The username you requested is already in use'));
		}

		console.error(error);
		return next(createError(500, 'An error occurred while trying to update the user'));
	}
});


router.post('/', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		// Hash the password
		const password = await bcrypt.hash(req.body.password, 10);

		// Create the new user object
		const newUser = { nickname: req.body.nickname, email: req.body.nickname, password };

		// Create the user in the database
		const user = await Users.createUser(newUser);

		// Respond with the new user data as a JSON object
		res.json(user);
	} catch (error) {
		// Handle any errors
		if (error.constraint === 'users_nickname_unique') {
			return next(createError(409, 'The username you requested is already in use'));
		}
		console.error(error);
		return next(createError(500, "An error occurred while trying to create a new user"));
	}
});

router.delete('/id/:id', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		// Extract the id from the request parameters
		const id = req.params.id;
		if (!id) {
			throw createError(400, 'No id specified');
		}

		// Validate the id
		if (!uuidRegex.test(id)) {
			throw createError(400, 'Invalid id');
		}

		// Delete the user
		await Users.deleteUser(id);

		// Respond with a success message
		res.status(200).send({ message: 'User successfully deleted.' });
	} catch (error) {
		// Handle any errors
		console.error(error);
		return next(createError(500, 'An error occurred while trying to delete the user'));
	}
});

router.post('/login', async function (req, res, next) {
	try {
		// check for user credentials
		const user = await Users.login(req.body.username, req.body.password);

		if (!user) return (403, "Invalid username or password")

		// generate a JWT with an expiration time of 1 hour
		const token = jwt.sign({ id: user.id, name: user.nickname, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
		// generate a refresh token with an expiration time of 7 days
		const refreshToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

		res.json({ token, refreshToken });
	} catch (error) {
		console.error(error);
		return next(createError(500, "An error occurred while trying to log in"));
	}

});

router.post('/refresh-token', async function (req, res) {
	const { refreshToken } = req.body;

	jwt.verify(refreshToken, process.env.JWT_SECRET, async (err, decoded) => {
		if (err) return next(createError(401, 'Invalid refresh token'));

		const user = await Users.getUser(decoded.id);

		const token = jwt.sign({ name: user.nickname, id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });
		res.json({ token });
	});
});

module.exports = router;
