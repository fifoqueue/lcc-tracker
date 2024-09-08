const { Worker } = require('node:worker_threads');
const fs = require('node:fs');
const { Cron } = require('croner');
const config = require('./config.json');
const { instance } = require('./instance');

(async () => {
  for (const file of fs.readdirSync('./workers')) {
    if (!file.endsWith('.js')) continue;

    // Create worker from the file
    const worker = new Worker(`./workers/${file}`);
    worker.on('message', async (message) => {
      if (!message.isNew) return false;
      console.log(new Date(), `Got ${message.newArticles.length} new events from ${message.workerName}`);
      await instance.post(config.webhookUrl, {
        content: config.content,
        embeds: message.newArticles.map((article) => ({
          title: article.title,
          url: article.url,
          description: article.description,
          image: { url: article.image },
          timestamp: article.createdAt,
          color: article.color,
        })),
      });
    });
    await Cron(config.cronExpression || '*/10 * * * * *', () => {
      worker.postMessage('RUN');
    }).trigger();
  }
})();
