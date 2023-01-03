const { db } = require("./db"); // Knex db

async function getItem(id) {
	try {
		let item = await db.select()
			.from('items')
			.where('items.id', id)
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
				.where('items_equipment_packs.pack_id', item.id);

			item.details = { contents: contents }

		} else if (item.type == 'Tool') {
			item.details = await db.select()
				.from('items_tools')
				.where('items_tools.id', item.id)
				.first();

			delete item.details.id
		}

		return item
	} catch (error) {
		throw error;
	}
}

async function deleteItem(id) {
	try {
		await db('items')
			.where('id', id)
			.del();
	} catch (error) {
		throw error;
	}
}

async function createItem(item) {
	try {
		// Start a transaction to ensure that all database queries are executed atomically
		await db.transaction(async trx => {
			// Insert the item into the 'items' table and return the generated ID
			item.id = await trx('items').insert({
				name: item.name,
				description: item.description,
				cost_gp: item.cost_gp,
				type: item.type,
				weight_lbs: item.weight_lbs
			}, ['id']);

			// Extract the ID from the returned array
			item.id = item.id[0].id;

			// Insert the item's properties into the 'item_properties' table
			if (item.properties) {
				for (property of item.properties) {
					await trx('item_properties').insert({
						item_id: item.id,
						property_id: property.id,
						details: property.details
					});
				}
			}

			// Create an object with the item's ID and details
			const details = {
				id: item.id,
				...item.details
			};

			// Insert the item's details into the appropriate table based on the item's type
			if (item.type == 'Weapon') {
				await trx('items_weapon').insert(details);

			} else if (item.type == 'Armor') {
				await trx('items_armor').insert(details);

			} else if (item.type == 'Adventuring Gear') {
				await trx('items_adventuring_gear').insert(details);

			} else if (item.type == 'Equipment Pack') {
				let toAdd = [];

				// Create an array of objects with the contents of the equipment pack
				for (const containedItem of item.details.contents) {
					toAdd.push({
						pack_id: item.id,
						content_id: containedItem.content_id,
						amount: containedItem.amount
					})
				}

				// Insert the contents of the equipment pack into the 'items_equipment_packs' table
				await trx('items_equipment_packs').insert(toAdd);

			} else if (item.type == 'Tool') {
				await trx('items_tools').insert(details);

			} else {
				// Throw an error if the item type is invalid
				throw 'Invalid item type';
			}
		});

		// Retrieve the newly created item from the database
		let newItem = await getItem(item.id)

		// Return the newly created item
		return newItem;

	} catch (error) {
		// Throw the error if something went wrong
		throw error;
	}
}

async function listItems(pageNumber = 1, pageSize = 10) {
	try {
		// Calculate the offset based on the page number and page size
		const offset = (pageNumber - 1) * pageSize;
		// Query the database, using the offset and limit to implement paging
		const items = await db.select().from('items').limit(pageSize).offset(offset);
		// Return the page of items
		return items;

	} catch (error) {
		throw error;
	}
}

async function findItem(searchQuery, pageNumber = 1, pageSize = 10) {
	try {
		// Calculate the offset based on the page number and page size
		const offset = (pageNumber - 1) * pageSize;
		// Query the database, using the offset and limit to implement paging
		let items = await db.select().from('items').whereILike('name', '%' + searchQuery + '%').limit(pageSize).offset(offset);

		return items;
	} catch (error) {
		throw error;
	}
}

async function listProperties(pageNumber = 1, pageSize = 10) {
	try {
		// Calculate the offset based on the page number and page size
		const offset = (pageNumber - 1) * pageSize;
		// Query the database, using the offset and limit to implement paging
		const items = await db.select().from('properties').limit(pageSize).offset(offset);
		// Return the page of items
		return items;

	} catch (error) {
		throw error;
	}
}

async function getProperty(id) {
	try {
		// Get the property in the database
		let property = await db.select()
			.from('properties')
			.where('properties.id', id)
			.first();
		// Return the user
		return property;

	} catch (error) {
		throw error;
	}
}

async function createProperty(property) {
	try {
		const newProperty = await db('properties').insert(property, ['id', 'name', 'description']);

		return newProperty[0];

	} catch (error) {
		throw error;
	}
}

async function updateProperty(property) {
	try {
		let response = await db('properties')
			.where('properties.id', property.id)
			.update(property, ['id', 'name', 'description']);

		return response[0];

	} catch (error) {
		throw error;
	}
}

module.exports = { getItem, deleteItem, createItem, listItems, listProperties, getProperty, createProperty, updateProperty, findItem }