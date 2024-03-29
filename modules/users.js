const { db } = require("./db");

const bcrypt = require('bcrypt');

async function getUser(id) {
	try {
		// Get the user in the database
		let user = await db.select('id', 'name', 'email', 'role')
			.from('users')
			.where('users.id', id)
			.first();

		// Return the user
		return user;

	} catch (error) {
		throw error;
	}
}

async function updateUser(id, user) {
	try {
		// Update the user in the database
		const updatedUser = await db('users')
			.where({ id })
			.update(user, ['id', 'name', 'email', 'role']);

		// Return the updated user data
		return updatedUser;
	} catch (error) {
		throw error;
	}
}


async function createUser(newUser) {
	try {
		// Insert the new user into the database
		let user = await db('users')
			.insert({
				name: newUser.name,
				password: newUser.password,
				email: newUser.email,
				role: newUser.role
			},
				["id", "name", "email", "role"]);

		// Return the newly created user
		return user[0];

	} catch (error) {
		throw error;
	}

}

async function deleteUser(id) {
	try {
		await db('users')
			.where('id', id)
			.del();
	} catch (error) {
		throw error;
	}

}

async function listUsers(page, pageSize) {
	try {
		// Calculate the offset based on the page and page size
		const offset = (page - 1) * pageSize;

		// Query the database for the specified page of users
		const users = await db('users')
			.select('id', 'name', 'email', 'role')
			.limit(pageSize)
			.offset(offset);

		return users;
	} catch (error) {
		throw error;
	}
}

async function login(username, password) {
	const user = await db.select().from('users').where('name', username).first();

	if (!user) return false;

	const match = await bcrypt.compare(password, user.password);

	if (match) {
		return user;
	} else {
		return false;
	}

}

module.exports = { getUser, updateUser, createUser, deleteUser, listUsers, login }