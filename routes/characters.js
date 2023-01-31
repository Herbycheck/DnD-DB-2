const createError = require('http-errors');
const express = require('express');
const router = express.Router();

const Characters = require('../modules/characters');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get('/my', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(403, 'Not logged in'));

		const ownerId = req.decoded.id;

		const characters = await Characters.listUserCharacters(ownerId);

		return res.json(characters);

	} catch (error) {
		return (next(createError(500, 'An error occurred while trying to list characters')));
	}
});

router.post('/', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));


		let character = req.body;

		const newCharacter = await Characters.createCharacter(character);

		res.json(newCharacter)

	} catch (error) {
		console.error(error);

		if (error.constraint == 'owner') {
			return next(createError(400, 'Owner ID not found'))
		}

		return next(createError(500));
	};

});

router.get('/id/:id', async function (req, res, next) {

	if (!uuidRegex.test(req.params.id)) {
		return next(createError(400, "Invalid character id"));
	}

	try {
		const character = await Characters.getCharacter(req.params.id);

		if (!character) {
			return next(createError(404, "Character not found"))
		}

		res.json(character);

	} catch (error) {
		console.error(error);

		return next(createError(500, "An error occurred while trying to retrieve the character"));

	}
});

router.put('/id/:id', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		let character = req.body;

		let characterId = req.params.id;

		if (!uuidRegex.test(characterId)) {
			return next(createError(400, "Invalid character id"));
		}

		const updatedCharacter = await Characters.updateCharacter({ id: characterId, ...character })

		return res.json(updatedCharacter);

	} catch (error) {
		console.error(error);

		return next(createError(500, 'An error occurred while trying to update a character'))
	}

});

router.get('/traits', async function (req, res, next) {
	// Extract the page and page size from the request query parameters
	const page = req.query.page || 1;
	const pageSize = req.query.pageSize || 10;

	try {
		const traits = await Characters.listTraits(page, pageSize)

		return res.json(traits)
	} catch (error) {
		console.error(error);
		return next(createError(500));
	}
})

router.post('/traits', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		const newTrait = await Characters.createTrait(req.body);

		res.json(newTrait);

	} catch (error) {
		console.error(error);

		return next(createError(500));
	}

});

router.get('/proficiencies', async function (req, res, next) {
	// Extract the page and page size from the request query parameters
	const page = req.query.page || 1;
	const pageSize = req.query.pageSize || 10;
	const searchQuery = req.query.search_query;

	try {
		const proficiencies = await Characters.listProficiencies(page, pageSize, searchQuery);

		return res.json(proficiencies)
	} catch (error) {
		console.error(error);
		return next(createError(500));
	}
});

router.post('/proficiencies', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		const newProficiency = await Characters.createProficiency(req.body);

		res.json(newProficiency);

	} catch (error) {
		console.error(error);

		return next(createError(500));
	}

});

router.get('/proficiencies/id/:id', async function (req, res, next) {
	try {
		const id = req.params.id;

		if (!uuidRegex.test(id)) {
			return next(createError(400, 'Invalid proficiency id'));
		}

		const proficiency = await Characters.getProficiency(id);

		if (!proficiency) {
			return next(createError(404, 'Proficiency not found'));
		}

		return res.json(proficiency);

	} catch (error) {
		console.error(error);

		return next(createError(500, 'An error occurred while looking up a proficiency'));
	}
})

module.exports = router
