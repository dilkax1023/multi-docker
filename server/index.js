const keys = require('./keys');
const redis = require('redis');
const { Pool } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

// Express setup
const app = express();
app.use(bodyParser.json());
app.use(cors());

// Postgres setup
const pool = new Pool({
	user: keys.pgUser,
	host: keys.pgHost,
	database: keys.pgDatabase,
	password: keys.pgPassword,
	port: keys.pgPort,
});

pool.on('connect', (pgClient) => {
	pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)').catch((err) => console.log(err));
});

// Redis setup
const redisClient = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 3000,
});

const redisPublisher = redisClient.duplicate();

// Express route handlers

app.get('/', (req, res) => {
	res.send('Hi');
});

app.get('/values/all', async (req, res) => {
	const values = await pool.query('SELECT * from values');

	res.send(values.rows);
});

app.get('/values/current', async (req, res) => {
	redisClient.hgetall('values', (err, values) => {
		res.send(values);
	});
});

app.post('/values', async (req, res) => {
	const index = req.body.index;

	redisClient.hset('values', index, 'Nothing yet!');
	redisPublisher.publish('insert', index);
	pool.query('INSERT INTO values(number) VALUES($1)', [index]);

	res.send({ working: true });
});

app.listen(5000, (err) => {
	console.log('Listening');
});
