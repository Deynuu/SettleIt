import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const p = await b.newPage({ viewport: { width: 375, height: 900 } });
await p.goto("file://" + process.cwd() + "/out.html");
console.log(await p.evaluate(() => [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > 376).map(e => e.tagName + "." + e.className + " " + Math.round(e.getBoundingClientRect().right)).slice(0, 10)));
await b.close();
