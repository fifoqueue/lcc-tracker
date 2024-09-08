const { parentPort } = require('node:worker_threads');
const { instance, redis } = require('../instance');
const { naverCookie } = require('../config.json');

const decodeEscapedHTML = (str) => str.replace(
  /&(\D+);/gi,
  (tag) => ({
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&#39;': "'",
    '&quot;': '"',
  }[tag]),
);

parentPort?.on('message', (async (message) => {
  if (message !== 'RUN') return false;

  const lastNo = Number(await redis.get('last-jpnstory') ?? 0);
  const page = await instance.get('https://apis.naver.com/cafe-web/cafe-mobile/CafeMobileWebArticleSearchListV4', {
    params: {
      cafeId: 10110775,
      query: '특가',
      searchBy: 1,
      sortBy: 'date',
      page: 1,
      perPage: 3,
      adUnit: 'MW_CAFE_BOARD',
      menuId: 224,
    },
    headers: {
      Cookie: naverCookie,
    },
  });
  const newEvents = page.message?.result?.articleList.filter((el) => el.articleId > lastNo).reverse();
  if (!newEvents.length) {
    parentPort.postMessage({ isNew: false, newArticles: [] });
    return false;
  }

  const lastId = newEvents.at(-1).articleId;
  const mapped = newEvents.map((el) => ({
    title: decodeEscapedHTML(el.subject.replace(/<\/?\w+>/g, '')),
    description: decodeEscapedHTML(el.summary),
    url: `https://cafe.naver.com/jpnstory/${el.articleId}`,
    image: el.thumbnailImageUrl || null,
    color: 0x32a852,
    createdAt: new Date(el.addDate.slice(4).replace('KST', '')).toISOString(),
  }));
  await redis.set('last-jpnstory', lastId);
  if (lastNo === 0) return false;

  parentPort.postMessage({
    isNew: true,
    workerName: '네일동',
    newArticles: mapped,
  });
}));
