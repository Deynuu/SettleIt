import { chromium } from "/home/claude/.npm-global/lib/node_modules/playwright/index.mjs";
const b = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }).catch(() => chromium.launch());
for (const w of [320, 375, 430, 1280]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.goto("file://" + process.cwd() + "/out.html");
  const o = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  console.log(w, o, o.sw <= o.cw ? "no-hscroll" : "HSCROLL");
  await p.screenshot({ path: `shot-${w}.png`, fullPage: true });
}
await b.close();
