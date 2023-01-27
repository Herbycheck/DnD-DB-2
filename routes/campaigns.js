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

		const campaigns = await Campaigns.getUserCampaigns(req.decoded.id);

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

module.exports = router
