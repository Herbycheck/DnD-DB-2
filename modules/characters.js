const { db } = require("./db"); // Knex db

async function listUserCharacters(ownerId, pageNumber = 1, pageSize = 10, searchQuery = "") {
	// calculate the offset based on the page number and page size
	const offset = (pageNumber - 1) * pageSize;
	// get total number of rows that match the search query 
	const total = await db('characters')
		.where('characters.owner_id', ownerId)
		.andWhereILike('name', '%' + searchQuery + '%')
		.count();

	const characters = await db.select()
		.from('characters')
		.where('owner_id', ownerId)
		.andWhereILike('name', '%' + searchQuery + '%')
		.limit(pageSize)
		.offset(offset);

	return {
		characters,
		total: total[0].count
	};
}

async function getCharacter(id) {
	let character = await db.select()
		.from('characters')
		.where('characters.id', id)
		.first();

	if (character == undefined) throw ("Character not found in database");

	// Combat
	character.combat = await db.select()
		.from('characters_combat')
		.where('character_id', character.id)
		.first();

	delete character.combat.character_id;

	// Skills
	let skills = await db.select()
		.from('characters_skills')
		.where('character_id', character.id)
		.first();

	let skill_modifiers = await db.select()
		.from('characters_skills_modifiers')
		.where('character_id', character.id)
		.first();

	character.skills = {
		Strength: { value: skills.str, modifier: skill_modifiers.str },
		Dexterity: { value: skills.dex, modifier: skill_modifiers.dex },
		Condition: { value: skills.con, modifier: skill_modifiers.con },
		Intelligence: { value: skills.int, modifier: skill_modifiers.int },
		Wisdom: { value: skills.wis, modifier: skill_modifiers.wis },
		Charisma: { value: skills.cha, modifier: skill_modifiers.cha }
	}


	// Skill proficiencies
	character.skill_proficiencies = await db.select()
		.from('characters_skills_proficiencies')
		.where('character_id', character.id)
		.first();

	delete character.skill_proficiencies.character_id;

	// Character details (background)
	character.details = await db.select()
		.from('characters_details')
		.where('character_id', character.id)
		.first();

	delete character.details.character_id;

	// Money
	character.money = await db.select()
		.from('characters_money')
		.where('character_id', character.id)
		.first();

	delete character.money.character_id;


	// Proficiencies
	character.proficiencies = await db.select('characters_proficiencies.proficiency_id', 'proficiencies.name', 'proficiencies.type')
		.from('characters_proficiencies')
		.innerJoin('proficiencies', 'characters_proficiencies.proficiency_id', 'proficiencies.id')
		.where('character_id', character.id);


	// Traits
	character.traits = await db.select('characters_traits.trait_id', 'traits.name', 'traits.description')
		.from('characters_traits')
		.innerJoin('traits', 'characters_traits.trait_id', 'traits.id')
		.where('character_id', character.id);


	// Items
	character.items = await db.select('items.name', 'characters_items.item_id', 'characters_items.amount', 'characters_items.equipped')
		.from('characters_items')
		.innerJoin('items', 'characters_items.item_id', 'items.id')
		.where('character_id', character.id);

	return character;
}

async function createCharacter(character) {
	await db.transaction(async trx => {

		character.id = await trx('characters').insert({
			name: character.name,
			owner_id: character.owner_id,
			level: character.level,
			class: character.class,
			race: character.race,
			background: character.background,
			alignment: character.alignment,
			xp: character.xp
		}, ['id']);

		character.id = character.id[0].id;

		// Combat
		await trx('characters_combat').insert({
			character_id: character.id,
			...character.combat
		});

		// Skills and Modifiers
		let skills = {
			character_id: character.id,
			str: character.skills.Strength.value,
			dex: character.skills.Dexterity.value,
			con: character.skills.Condition.value,
			int: character.skills.Intelligence.value,
			wis: character.skills.Wisdom.value,
			cha: character.skills.Charisma.value,
		}

		let skill_modifiers = {
			character_id: character.id,
			str: character.skills.Strength.modifier,
			dex: character.skills.Dexterity.modifier,
			con: character.skills.Condition.modifier,
			int: character.skills.Intelligence.modifier,
			wis: character.skills.Wisdom.modifier,
			cha: character.skills.Charisma.modifier,
		}

		await trx('characters_skills').insert(skills);
		await trx('characters_skills_modifiers').insert(skill_modifiers);

		// Skill proficiencies
		await trx('characters_skills_proficiencies').insert({
			character_id: character.id,
			...character.skill_proficiencies
		});

		// Character details (background)
		await trx('characters_details').insert({
			character_id: character.id,
			...character.details
		});

		// Money
		await trx('characters_money').insert({
			character_id: character.id,
			...character.money
		});

		// Proficiencies
		let proficiencies = character.proficiencies.map(x => ({ proficiency_id: x.proficiency_id, character_id: character.id }));

		// only try to insert if the array isn't empty
		if (proficiencies.length) {
			await trx('characters_proficiencies').insert(proficiencies);
		}

		// Traits
		let traits = character.traits.map(x => ({ trait_id: x.trait_id, character_id: character.id }));

		// only try to insert if the array isn't empty
		if (traits.length) {
			await trx('characters_traits').insert(traits);
		}

		// Items
		let items = character.items.map(x => ({ item_id: x.item_id, amount: x.amount, equipped: x.equipped, character_id: character.id }));

		// only try to insert if the array isn't empty
		if (items.length) {
			await trx('characters_items').insert(items);
		}
	});

	return getCharacter(character.id);
}

async function updateCharacter(character) {
	await db.transaction(async trx => {

		await trx('characters')
			.where('characters.id', character.id)
			.update({
				name: character.name,
				owner_id: character.owner_id,
				level: character.level,
				class: character.class,
				race: character.race,
				background: character.background,
				alignment: character.alignment,
				xp: character.xp
			});

		// Combat
		await trx('characters_combat')
			.where('characters_combat.character_id', character.id)
			.update(character.combat);

		// Skills and Modifiers
		let skills = {
			character_id: character.id,
			str: character.skills.Strength.value,
			dex: character.skills.Dexterity.value,
			con: character.skills.Condition.value,
			int: character.skills.Intelligence.value,
			wis: character.skills.Wisdom.value,
			cha: character.skills.Charisma.value,
		}

		let skill_modifiers = {
			character_id: character.id,
			str: character.skills.Strength.modifier,
			dex: character.skills.Dexterity.modifier,
			con: character.skills.Condition.modifier,
			int: character.skills.Intelligence.modifier,
			wis: character.skills.Wisdom.modifier,
			cha: character.skills.Charisma.modifier,
		}

		await trx('characters_skills')
			.where('character_id', character.id)
			.update(skills);

		await trx('characters_skills_modifiers')
			.where('character_id', character.id)
			.update(skill_modifiers);

		// Skill proficiencies
		await trx('characters_skills_proficiencies')
			.where('characters_skills_proficiencies.character_id', character.id)
			.update(character.skill_proficiencies);

		// Character details (background)
		await trx('characters_details')
			.where('characters_details.character_id', character.id)
			.update(character.details);

		// Money
		await trx('characters_money')
			.where('characters_money.character_id', character.id)
			.update(character.money);


		// Proficiencies
		await trx('characters_proficiencies')
			.where('characters_proficiencies.character_id', character.id)
			.del();

		let proficiencies = character.proficiencies.map(x => ({ proficiency_id: x.proficiency_id, character_id: character.id }));

		// only try to insert if the array isn't empty
		if (proficiencies.length) {
			await trx('characters_proficiencies').insert(proficiencies);
		}

		// Traits
		await trx('characters_traits')
			.where('characters_traits.character_id', character.id)
			.del();

		let traits = character.traits.map(x => ({ trait_id: x.trait_id, character_id: character.id }));

		// only try to insert if the array isn't empty
		if (traits.length) {
			await trx('characters_traits').insert(traits);
		}

		// Items
		await trx('characters_items')
			.where('characters_items.character_id', character.id)
			.del();

		let items = character.items.map(x => ({ item_id: x.item_id, amount: x.amount, equipped: x.equipped, character_id: character.id }));

		// only try to insert if the array isn't empty
		if (items.length) {
			await trx('characters_items').insert(items);
		}
	});

	return getCharacter(character.id);

}

async function createTrait(trait) {
	let newTrait = await db('traits').insert(trait, ["id", "name", "description"])

	return newTrait[0];
}

async function listTraits(pageNumber = 1, pageSize = 10) {
	// Calculate the offset based on the page number and page size
	const offset = (pageNumber - 1) * pageSize;
	// Query the database, using the offset and limit to implement paging
	const items = await db.select().from('traits').limit(pageSize).offset(offset);
	// Return the page of items
	return items;
}

async function getProficiency(id) {
	const proficiency = await db.select()
		.from('proficiencies')
		.where('id', id)
		.first();

	return proficiency;
}

async function listProficiencies(pageNumber = 1, pageSize = 10, searchQuery = "") {
	// Calculate the offset based on the page number and page size
	const offset = (pageNumber - 1) * pageSize;

	// get total number of rows that match the search query 
	const total = await db('proficiencies').whereILike('name', '%' + searchQuery + '%').count()

	// Query the database, using the offset and limit to implement paging
	const proficiencies = await db.select().from('proficiencies')
		.whereILike('name', '%' + searchQuery + '%')
		.limit(pageSize)
		.offset(offset);

	// Return the page of items
	return { proficiencies, total: total[0].count };
}

async function createProficiency(proficiency) {
	let newTrait = await db('proficiencies').insert(proficiency, ["id", "name", "type"])

	return newTrait[0];
}

module.exports = { listUserCharacters, getCharacter, updateCharacter, createCharacter, listTraits, createTrait, listProficiencies, getProficiency, createProficiency }
