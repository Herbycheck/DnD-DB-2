const createError = require('http-errors');
const express = require('express');
const router = express.Router();

const Items = require('../modules/items');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.get('/', async function (req, res, next) {
	// Extract the page and page size from the request query parameters
	const page = req.query.page || 1;
	const pageSize = req.query.pageSize || 10;
	const searchQuery = req.query.search_query;

	try {
		let items = await Items.listItems(page, pageSize, searchQuery)

		return res.json(items)
	} catch (error) {
		console.error(error);
		return next(createError(500));
	}
});

router.post('/', async function (req, res, next) {
	try {
		let item = req.body.item;

		let newItem = await Items.createItem(item);

		res.json(newItem);

	} catch (error) {
		console.error(error);

		return next(createError(500));
	};

});

router.get('/id/:id/', async function (req, res, next) {
	try {
		let id = req.params.id == undefined ? null : req.params.id;

		if (!id) return next(createError(400, "No id defined"));

		if (!uuidRegex.test(id)) return next(createError(400, "Invalid item id"));

		let item = await Items.getItem(id);

		res.json(item);

	} catch (error) {
		console.error(error)
		return next(createError(500))
	}

});

router.put('/id/:id', async function (req, res, next) {
	try {
		let id = req.params.id;
		if (!id) return next(createError(400, 'No item id specified.'));
		if (!uuidRegex.test(id)) return next(createError(400, "Invalid item id"));

		const updatedItem = await Items.updateItem(req.body);

		return res.json(updatedItem);

	} catch (error) {
		console.error(error);
		return next(createError(500, 'An error occurred while trying to update an item.'))
	}
})

router.delete('/id/:id/', async function (req, res, next) {
	try {
		let id = req.params.id;

		if (!id) return next(createError(400, "No itemId specified"));

		if (!uuidRegex.test(id)) return next(createError(400, "Invalid item id"));

		await Items.deleteItem(id);

		res.status(200).send({ message: "Item successfully deleted." })

	} catch (error) {
		console.error(error);
		return next(createError(500, "An error occurred while trying to delete an item."));
	}
});

router.get('/properties/', async function (req, res, next) {
	// Extract the page and page size from the request query parameters
	const page = req.query.page || 1;
	const pageSize = req.query.pageSize || 10;
	const searchQuery = req.query.search_query;

	try {
		let properties = await Items.listProperties(page, pageSize, searchQuery);

		return res.json(properties)
	} catch (error) {
		console.error(error);
		return next(createError(500));
	}

})

router.post('/properties/', async function (req, res, next) {
	try {
		const property = {
			name: req.body.name,
			description: req.body.description
		}

		if (!property.name || !property.description) return next(createError(400, "Incomplete property details provided."));

		const newProperty = await Items.createProperty(property)

		return res.json(newProperty)

	} catch (error) {
		console.error(error);
		next(createError(500, "An error occurred while trying to create a property"));
	}
})

router.get('/properties/id/:id', async function (req, res, next) {
	try {
		let id = req.params.id == undefined ? null : req.params.id;

		if (!id) return next(createError(400, "No id defined"));

		if (!uuidRegex.test(id)) return next(createError(400, "Invalid property id"));

		let property = await Items.getProperty(id);

		res.json(property);

	} catch (error) {
		console.error(error)
		return next(createError(500))
	}

});

router.put('/properties/id/:id', async function (req, res, next) {
	let id = req.params.id == undefined ? null : req.params.id;

	if (id == null) return next(createError(400, "No id specified"));

	if (!uuidRegex.test(id)) return next(createError(400, "Invalid property id"));

	// Create the user object with the updated properties
	const property = { id: id };

	if (req.body.name) {
		property.name = req.body.name;
	}
	if (req.body.description) {
		property.description = req.body.description;
	}

	try {

		let updatedProperty = await Items.updateProperty(property)

		return res.send(updatedProperty);

	} catch (error) {

		console.error(error)
		return next(createError(500, "Database error"))

	}

})

router.delete('/properties/id/:id', async function (req, res, next) {
	let propertyId = req.query.id;

	if (propertyId == undefined) return next(createError(400, "No id specified"));

	try {
		await db('properties')
			.where('id', propertyId)
			.del();

	} catch (error) {
		return next(createError(500, "Database error"))
	}

	res.status(200).send({ message: "Property successfully deleted." })

});

module.exports = router
