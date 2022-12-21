const db = require('knex')({
    client: 'pg',
    connection: {
      host : 'example.com',
      port : 5432,
      user : 'postgres',
      password : 'xxxxxxxxxxx',
      database : 'dndb'
    }
  });

  module.exports = {db}