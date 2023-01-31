const { db } = require("./db"); // Knex db
const bcrypt = require('bcrypt');

async function createCampaign(name, maxPlayers, ownerId, password) {

	const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

	const campaign = await db('campaigns').insert({
		name: name,
		max_players: maxPlayers,
		owner_id: ownerId,
		password: hashedPassword
	},
		['id']);

	await db('campaigns_users').insert({
		campaign_id: campaign[0].id,
		user_id: ownerId,
		role: 'dungeon_master'
	});

	return getCampaign(campaign[0].id);
}

async function getCampaign(campaign_id) {
	const campaign = await db.select()
		.from('campaigns')
		.where('id', campaign_id)
		.first();

	if (!campaign) return null;

	const users = await db.select('user_id', 'character_id', 'role')
		.from('campaigns_users')
		.where('campaign_id', campaign_id);

	campaign.users = users;

	return campaign;
}

async function getUserCampaigns(user_id) {
	const campaigns = await db.select('campaigns.id', 'campaigns.name', 'campaigns_users.role', 'campaigns.created_at')
		.from('campaigns')
		.innerJoin('campaigns_users', 'id', 'campaign_id')
		.where('user_id', user_id)
		.orWhere('owner_id', user_id);

	return campaigns;
}

async function joinCampaign(campaign_id, user_id, character_id, password) {
	// Get campaign and throw an error if no campaign with id exists
	const campaign = await db.select()
		.from('campaigns')
		.where('id', campaign_id)
		.first();

	if (!campaign) throw new Error('Campaign not found');

	// Only check password if the campaign requires it
	if (campaign.password) {
		const match = await bcrypt.compare(password, campaign.password);

		if (!match) throw new Error('Wrong password');
	}

	// Check if the user exists or is already part of the campaign
	// Add them if not, otherwise return an error
	const user_exists = await db.select()
		.from('users')
		.where('id', user_id)
		.first();

	if (!user_exists) throw new Error('User does not exist');

	const in_campaign = await db.select()
		.from('campaigns_users')
		.where('user_id', user_id)
		.first();

	if (in_campaign) throw new Error('User already in campaign');

	// check if the character exists and if the user is the owner
	const character = await db.select()
		.from('characters')
		.where('id', character_id)
		.first();

	if (!character) throw new Error('Character does not exist');
	if (character.owner_id != user_id) throw new Error('User is not the owner of the character');

	// Finally insert everything into the database
	await db('campaigns_users').insert({
		campaign_id: campaign_id,
		user_id: user_id,
		character_id: character_id,
		role: 'player'
	})

	return getCampaign(campaign_id);
}

module.exports = { createCampaign, getCampaign, getUserCampaigns, joinCampaign };