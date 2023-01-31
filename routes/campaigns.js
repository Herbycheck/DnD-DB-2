const createError = require('http-errors');
const express = require('express');
const router = express.Router();

const Campaigns = require('../modules/campaigns');

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

router.post('/', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		const campaign = await Campaigns.createCampaign(req.body.name, req.body.max_players, req.decoded.id, req.body.password);

		return res.json(campaign);

	} catch (error) {
		console.error(error);
		return next(createError(500, 'An error occurred while trying to create a campaign'))
	}
});

router.get('/my', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(401, 'Not logged in'));

		// Extract the page and page size from the request query parameters
		const page = req.query.page || 1;
		const pageSize = req.query.pageSize || 10;
		const searchQuery = req.query.search_query;

		const campaigns = await Campaigns.getUserCampaigns(req.decoded.id, page, pageSize, searchQuery);

		return res.json(campaigns);

	} catch (error) {
		console.error(error);
		return next(createError(500, 'An error occurred while trying to get user campaigns'));
	}
});

router.get('/id/:id', async function (req, res, next) {
	try {
		let id = req.params.id;

		if (!uuidRegex.test(id)) return next(createError(400, 'Invalid campaign id, must be a uuid'));

		const campaign = await Campaigns.getCampaign(id);

		return res.json(campaign);

	} catch (error) {
		console.error(error);
		return next(createError(500, 'An error occurred while trying to look up a campaign'));
	}
});

router.post('/id/:id/join', async function (req, res, next) {
	try {
		if (!req.decoded) return next(createError(403, 'Not logged in.'));

		const user_id = req.decoded.id;
		const campaign_id = req.params.id;
		const character_id = req.body.character_id
		const password = req.body.password;

		if (!character_id) {
			return next(createError(400, 'No character id specified'));
		}

		const campaign = await Campaigns.joinCampaign(campaign_id, user_id, character_id, password);

		return res.json(campaign);

	} catch (error) {

		if (error == 'Campaign not found' ||
			error == 'User does not exist' ||
			error == 'User already in campaign' ||
			error == 'User is not the owner of the character'
		) return next(createError(500, error));

		console.log(error);
		return next(createError(500, 'An error occurred while joining a campaign.'));
	}
})

module.exports = router
