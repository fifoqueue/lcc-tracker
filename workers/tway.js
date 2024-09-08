const { JSDOM } = require('jsdom');
const { parentPort } = require('node:worker_threads');
const { instance, redis } = require('../instance');

parentPort?.on('message', (async (message) => {
  if (message !== 'RUN') return false;

  const lastArticles = await redis.json.get('last-tway') ?? [];
  const page = await instance.get('https://www.twayair.com/app/promotion/event/being');
  const { window: { document } } = new JSDOM(page);
  const newEvents = [...document.querySelectorAll('a[data-eventtitle]')].filter((ctx) => !lastArticles.includes(ctx.dataset.addinfo));
  if (!newEvents.length) {
    parentPort.postMessage({ isNew: false, newArticles: [] });
    return false;
  }

  const updatedArticles = lastArticles.concat(newEvents.map((el) => el.dataset.addinfo));
  const mapped = newEvents.map((el) => ({
    title: el.dataset.eventtitle.trim(),
    url: extractURL(el.dataset.addinfo),
    image: el.querySelector('img')?.src,
    color: 0xd42c27,
    createdAt: null,
  }));
  await redis.json.set('last-tway', '$', updatedArticles);
  if (!lastArticles.length) return false;

  parentPort.postMessage({
    isNew: true,
    workerName: '티웨이항공',
    newArticles: mapped,
  });
}));

function extractURL(str) {
  const replaced = str
    .replace(/\+/gi, '-')
    .replace(/\//gi, '_');
  return `https://www.twayair.com/app/promotion/event/retrieve/${replaced}/being/n`;
}
