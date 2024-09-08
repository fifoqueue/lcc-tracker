const axios = require('axios');
const { createClient } = require('redis');

const instance = axios.create({
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
  },
  validateStatus() { return true; },
});
instance.interceptors.response.use((ctx) => (ctx.config.raw ? ctx : ctx.data));
const redis = createClient();
redis.connect();

module.exports = { instance, redis };
