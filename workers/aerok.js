const { parentPort } = require('node:worker_threads');
const { instance, redis } = require('../instance');

parentPort?.on('message', (async (message) => {
  if (message !== 'RUN') return false;

  const lastNo = Number(await redis.get('last-aerok') ?? 0);
  const page = await instance.get('https://aerok-cms-prod.clinkers.io/v1/event', {
    params: {
      limit: 5,
      offset: 0,
      is_in_progress: true,
      lang: 'kr',
    },
  });
  const newEvents = page.content.filter((el) => el.id > lastNo);
  if (!newEvents.length) {
    parentPort.postMessage({ isNew: false, newArticles: [] });
    return false;
  }

  const lastId = newEvents[0].id;
  const mapped = newEvents.map((el) => ({
    title: el.title,
    url: `https://www.aerok.com/event/${el.id}`,
    image: /img src\s?=\s?['"]([^'"]*)['"]/.exec(el.content)?.pop(),
    color: 0x002554,
    createdAt: el.createdAt,
  }));
  await redis.set('last-aerok', lastId);
  if (lastNo === 0) return false;

  parentPort.postMessage({
    isNew: true,
    workerName: '에어로케이',
    newArticles: mapped,
  });
}));
