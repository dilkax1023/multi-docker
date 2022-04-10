const keys = require('./keys');
const redis = require('redis');

const client = redis.createClient({
	host: keys.redisHost,
	port: keys.redisPort,
	retry_strategy: () => 2000,
});

const subscribe = client.duplicate();

function fib(n) {
	if (n < 2) {
		return n;
	}

	return fib(n - 1) + fib(n - 2);
}

function memoise(fn) {
	const cache = {};
	return function (...args) {
		if (cache[args]) {
			return cache[args];
		}
		const fib = fn.apply(this, args);
		cache[args] = fib;
		return fib;
	};
}

const memoisedFib = memoise(fib);

subscribe.on('message', (_, message) => {
	if (!isFinite(message)) {
		return;
	}
	client.hset('values', message, memoisedFib(parseInt(message)));
});

subscribe.subscribe('insert');
