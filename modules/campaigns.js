const { db } = require("./db"); // Knex db
const bcrypt = require('bcrypt');

async function createCampaign(name, maxPlayers, ownerId, password) {

	const hashedPassword = await bcrypt.hash(password, 10);

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

module.exports = { createCampaign, getCampaign, getUserCampaigns };