const { JSDOM } = require('jsdom');
const { parentPort } = require('node:worker_threads');
const { instance, redis } = require('../instance');

parentPort?.on('message', (async (message) => {
  if (message !== 'RUN') return false;

  const lastArticles = await redis.json.get('last-jejuair') ?? [];
  const page = await instance.get('https://www.jejuair.net/ko/event/event.do');
  const { window: { document } } = new JSDOM(page);
  const newEvents = [...document.querySelectorAll('.search-result__item')].filter((ctx) => {
    const url = new URL(`https://www.jejuair.net/${ctx.children[0].href}`);
    const eventNo = Number(url.searchParams.get('eventNo'));
    return !lastArticles.includes(eventNo);
  });
  if (!newEvents.length) {
    parentPort.postMessage({ isNew: false, newArticles: [] });
    return false;
  }

  const updatedArticles = lastArticles.concat(newEvents.map((ctx) => Number(ctx.querySelector('a').href.split('=').pop())));
  const mapped = newEvents.map((el) => ({
    title: el.querySelector('.event-banner__text').innerHTML.replaceAll('<br>', ' '),
    url: `https://www.jejuair.net${el.querySelector('a').href}`,
    description: el.querySelector('.event-banner__title').innerHTML.replaceAll('<br>', ' ').trim(),
    image: el.querySelector('.event-banner-item').style.backgroundImage.slice(4, -1).replace(/['"]/g, ''),
    color: 0xff5000,
    createdAt: null,
  }));
  await redis.json.set('last-jejuair', '$', updatedArticles);
  if (!lastArticles.length) return false;

  parentPort.postMessage({
    isNew: true,
    workerName: '제주항공',
    newArticles: mapped,
  });
}));
