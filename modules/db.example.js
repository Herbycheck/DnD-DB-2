const db = require('knex')({
	client: 'pg',
	connection: {
		host: 'example.com',
		port: 5432,
		user: 'postgres',
		password: 'xxxxxxxxxxx',
		database: 'dndb'
	}
});

db.raw("SELECT 1").then(() => {
	console.log("PostgreSQL connected");
})
	.catch((e) => {
		console.log("PostgreSQL not connected");
		console.error(e);
	});
module.exports = { db }