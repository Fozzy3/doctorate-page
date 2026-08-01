import puppeteer from 'puppeteer-core';

const url = process.argv[2] ?? 'http://127.0.0.1:4322/';
const width = Number(process.argv[3] ?? 390);

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome-stable',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width, height: 900 });
await page.goto(url, { waitUntil: 'networkidle0' });

const report = await page.evaluate((vw) => {
  const doc = document.documentElement;
  const out = {
    viewport: vw,
    scrollWidth: doc.scrollWidth,
    overflows: [],
    menuToggle: null,
  };
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.width > vw + 1) {
      out.overflows.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className + '').slice(0, 60),
        width: Math.round(r.width),
        right: Math.round(r.right),
      });
    }
  }
  const t = document.querySelector('.menu-toggle');
  if (t) {
    const r = t.getBoundingClientRect();
    out.menuToggle = { display: getComputedStyle(t).display, x: Math.round(r.x), w: Math.round(r.width) };
  }
  // solo los 15 más anchos
  out.overflows.sort((a, b) => b.width - a.width);
  out.overflows = out.overflows.slice(0, 15);
  return out;
}, width);

console.log(JSON.stringify(report, null, 2));
await browser.close();
