const createError = require('http-errors');
const express = require('express');
const router = express.Router();

const { db } = require('../modules/db');

router.get('/', async function (req, res, next) {
    const characterId = req.query.characterId;

    if (characterId == null) return next(createError(400, 'No id defined'));

    try {
        let character = await db.select()
            .from('characters')
            .where('characters.id', characterId)
            .first();

        if (character == undefined) return next(createError(404));

        // Combat
        character.combat = await db.select()
            .from('characters_combat')
            .where('character_id', character.id)
            .first();

        delete character.combat.character_id;

        // Skills
        character.skills = await db.select()
            .from('characters_skills')
            .where('character_id', character.id)
            .first();

        delete character.skills.character_id;

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
        character.proficiencies = await db.select('proficiencies.id', 'proficiencies.name', 'proficiencies.type')
            .from('characters_proficiencies')
            .innerJoin('proficiencies', 'characters_proficiencies.proficiency_id', 'proficiencies.id')
            .where('character_id', character.id);


        // Traits
        character.traits = await db.select('traits.id', 'traits.name', 'traits.description')
            .from('characters_traits')
            .innerJoin('traits', 'characters_traits.trait_id', 'traits.id')
            .where('character_id', character.id);

            
        // Items
        character.items = await db.select('items.name', 'items.id', 'characters_items.amount', 'characters_items.equipped')
            .from('characters_items')
            .innerJoin('items', 'characters_items.item_id', 'items.id')
            .where('character_id', character.id);

        return res.json(character);

    } catch (error) {
        console.error('Error when looking for a character:');
        console.error(error);

        if (error.routine == 'string_to_uuid') {
            return next(createError(400, 'Invalid character id'));
        }

        return next(createError(500));

    }
});

router.post('/', async function (req, res, next) {
    try {
        let response = await db.transaction(async trx => {
            let character = req.body.character;

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

            // Skills
            await trx('characters_skills').insert({
                character_id: character.id,
                ...character.skills
            });

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
            let proficiencies = character.proficiencies.map(x => ({ ...x, character_id: character.id }));
            await trx('characters_proficiencies').insert(proficiencies);

            // Traits
            let traits = character.traits.map(x => ({ ...x, character_id: character.id }));
            await trx('characters_traits').insert(traits);

            // Items
            let items = character.items.map(x => ({ ...x, character_id: character.id }));
            await trx('characters_items').insert(items);

            return character;

        });

        res.json(response);

    } catch (error) {
        console.error(error);

        if (error.constraint == 'owner') {
            return next(createError(400, 'Owner ID not found'))
        }

        return next(createError(500));
    };

});

router.post('/traits', async function (req, res, next) {

    try {
        let response = await db('traits').insert(req.body, ["id", "name", "description"])

        return res.json(response);
    } catch (error) {
        console.error(error);

        return next(createError(500));
    }

});
module.exports = router
