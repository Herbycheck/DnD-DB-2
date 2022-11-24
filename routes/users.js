const createError = require('http-errors');
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');

const { db } = require('../db');

router.get('/', async function (req, res, next) {
	let userId = req.query.userId == undefined ? null : req.query.userId;
	let nickname = req.query.nickname == undefined ? null : req.query.nickname;

	if (userId == null && nickname == null) return res.status(404).send({ message: "No userId or nickname defined" });

	try {
		let user = await db.select('id', 'nickname', 'email')
			.from('users')
			.where('users.id', userId)
			.orWhere('users.nickname', nickname)
			.first();

		res.json(user);

	} catch (error) {
		console.error(error)
		next(createError(500, 'Database error.'));
	}
});

router.patch('/', async function (req, res, next) {
	let userId = req.query.userId;

	if (userId == undefined) return res.status(404).send({ message: "No userId defined" });

	let user = {};

	if (req.body.nickname != undefined) {
		user.nickname = req.body.nickname;
	}

	if (req.body.email != undefined) {
		user.email = req.body.email;
	}

	if (req.body.password != undefined) {
		user.password = await bcrypt.hash(password, 10);
	}

	try {
		let response = await db('users').where({ id: userId }).update(user, ["id", "nickname", "email"])

		res.json(response[0]);

	} catch (error) {
		console.error(error);

		if ((error.constraint)) {
			return next(createError(409, error.constraint));
		}

		return next(createError(500, 'Database error'));
	}


});

router.post('/', async function (req, res, next) {
	let nickname = req.body.nickname;
	let password = req.body.password;
	let mail = req.body.email;

	if (nickname == undefined || password == undefined || mail == undefined) return next(createError(400));

	password = await bcrypt.hash(password, 10);

	try {
		let user = await db
			.insert({ nickname: nickname, password: password, email: mail }, ["id", "nickname", "email"])
			.into('users');

		res.json(user);

	} catch (error) {
		console.error(error);

		if (error.constraint == 'users_nickname') {
			return next(createError(409, 'Username already in use!'))
		}

		return next(createError(500, "Database error"));

	}

});

router.delete('/', async function (req, res, next) {
	let userId = req.query.userId;

	if (userId == undefined) return next(createError(400, "No userId specified"));


	try {
		await db('users')
			.where('id', userId)
			.del();
	} catch (error) {
		return next(createError(500, "Database error"))
	}

	res.status(200).send({ message: "User successfully deleted." })

});
module.exports = router;
