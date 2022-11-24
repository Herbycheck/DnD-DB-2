const createError = require('http-errors');
const express = require('express');
const router = express.Router();

const { db } = require('../db');

router.get('/', async function (req, res, next) {
	let itemId = req.query.id == undefined ? null : req.query.id;
	let itemName = req.query.name == undefined ? null : req.query.name;

	if (itemId == null && itemName == null) return next(createError(400, "No id or name defined"));

	try {
		let item = await db.select()
			.from('items')
			.where('items.id', itemId)
			.orWhere('items.name', itemName)
			.first();

		if (item == undefined) return next(createError(404))

		item.properties = await db.select('name', 'details', 'description')
			.from('item_properties')
			.innerJoin('properties', 'item_properties.property_id', 'properties.id')
			.where('item_properties.item_id', item.id)

		if (item.type == 'Weapon') {
			item.details = await db.select()
				.from('items_weapon')
				.where('items_weapon.id', item.id)
				.first();

			delete item.details.id

		} else if (item.type == 'Armor') {
			item.details = await db.select()
				.from('items_armor')
				.where('items_armor.id', item.id)
				.first();

			delete item.details.id

		} else if (item.type == 'Adventuring Gear') {
			item.details = await db.select()
				.from('items_adventuring_gear')
				.where('items_adventuring_gear.id', item.id)
				.first();

			delete item.details.id

		} else if (item.type == 'Equipment Pack') {
			let contents = await db.select('items.id', 'items.name', 'items_equipment_packs.amount')
				.from('items_equipment_packs')
				.innerJoin('items', 'items_equipment_packs.content_id', 'items.id')
				.where('items_equipment_packs.id', item.id);

			item.details = { contents: contents }

		} else if (item.type == 'Tool') {
			item.details = await db.select()
				.from('items_tools')
				.where('items_tools.id', item.id)
				.first();

			delete item.details.id
		}

		res.json(item)

	} catch (error) {
		console.error(error)
		return next(createError(500))
	}

});

router.delete('/', async function (req, res, next) {
	let itemId = req.query.id;

	if (itemId == undefined) return next(createError(400, "No itemId specified"));

	try {
		await db('items')
			.where('id', itemId)
			.del();
	} catch (error) {
		return next(createError(500, "Database error"))
	}

	res.status(200).send({ message: "Item successfully deleted." })
});

router.post('/', async function (req, res, next) {
	try {
		let response = await db.transaction(async trx => {
			let item = req.body.item;

			item.id = await trx('items').insert({
				name: item.name,
				description: item.description,
				cost_gp: item.cost_gp,
				type: item.type,
				weight_lbs: item.weight_lbs
			}, ['id']);

			item.id = item.id[0].id;

			for (property of item.properties) {
				await trx('item_properties').insert({
					item_id: item.id,
					property_id: property.id,
					details: property.details
				});
			};

			if (item.type == 'Weapon') {
				await trx('items_weapons').insert(item.details);

			} else if (item.type == 'Armor') {
				await trx('items_weapons').insert(item.details);

			} else if (item.type == 'Adventuring Gear') {
				await trx('items_weapons').insert(item.details);

			} else if (item.type == 'Equipment Pack') {
				let toAdd = [];

				for (const x in item.details.contents) {
					toAdd.push({
						pack_id: item.id,
						content_id: x.id,
						amount: x.amount
					})
				};

				await trx('items_equipment_packs').insert(toAdd);

			} else if (item.type == 'Tool') {
				await trx('items_weapons').insert(item.details);

			} else {
				throw 'Invalid item type';
			}

			return item;

		});

		res.json(response);

	} catch (error) {
		console.error(error);

		return next(createError(500));
	};

});

router.get('/list', async function (req, res, next) {
	let page = req.query.page == undefined ? 0 : req.query.page

	try {

		let items = await db.select()
			.from('items')
			.limit(25)
			.offset(25 * page);

		return res.json(items)


	} catch (error) {
		console.error(error);
		return next(createError(500));
	}
});

router.get('/properties/list', async function (req, res, next) {
	let page = req.query.page == undefined ? 0 : req.query.page

	try {
		let items = await db.select()
			.from('properties')
			.limit(25)
			.offset(25 * page);

		return res.json(items);

	} catch (error) {
		console.error(error);
		return next(createError(500));
	}
})

router.get('/properties', async function (req, res, next) {
	let propertyId = req.query.id == undefined ? null : req.query.id;
	let name = req.query.name == undefined ? null : req.query.name;

	if (propertyId == null && name == null) return next(createError(400, "No id or name defined"));

	try {
		let property = await db.select('id', 'name', 'description')
			.from('properties')
			.where('properties.id', propertyId)
			.orWhere('properties.name', name)
			.first();

		res.json(property);

	} catch (error) {
		console.error(error)
		next(createError(500, 'Database error.'));
	}
});

router.put('/properties', async function (req, res, next) {
	let property = {
		id: req.body.id == undefined ? null : req.body.id,
		name: req.body.name == undefined ? null : req.body.name,
		description: req.body.description == undefined ? null : req.body.description,
	}

	if (property.id == null) return next(createError(400, "No id specified"));

	try {
		let response = await db('properties')
			.where('properties.id', property.id)
			.update(property, ['id', 'name', 'description']);

		return res.send(response[0]);

	} catch (error) {

		console.error(error)
		return next(createError(500, "Database error"))

	}

})

router.delete('/properties', async function (req, res, next) {
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
