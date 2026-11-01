/**
 * Browser play-through: two real browsers (guests) create/join a room and play until the result screen.
 *   PORT=3100 npm start   # in another terminal
 *   npx tsx e2e/smoke.ts http://localhost:3100 ./e2e-shots
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { findFirstEquation, type RackTile } from "./solver";

const require = createRequire(import.meta.url);
let pw: typeof import("playwright");
try { pw = require("playwright"); } catch { pw = require("/opt/node-tools/node_modules/playwright"); }

const BASE = process.argv[2] ?? "http://localhost:3000";
const OUT = process.argv[3] ?? "e2e-shots";
mkdirSync(OUT, { recursive: true });
type Page = import("playwright").Page;

const shot = (p: Page, name: string) => p.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });
const status = (p: Page) => p.getByTestId("game-status").innerText();
const log = (...a: unknown[]) => console.log("•", ...a);

async function rack(p: Page): Promise<RackTile[]> {
  return p.$$eval("[aria-label='Your rack'] [data-tile-id]", (els) =>
    els.map((e) => ({ id: (e as HTMLElement).dataset.tileId!, face: (e.querySelector("[data-face]") as HTMLElement).dataset.face as never })));
}

async function placeRow(p: Page, choices: { tile: RackTile; value: string }[]) {
  const start = 7 - Math.floor(choices.length / 2);
  for (const [i, c] of choices.entries()) {
    await p.click(`[data-tile-id='${c.tile.id}']`);
    await p.click(`[data-cell='7,${start + i}']`);
    const def = c.tile.face;
    if (def === "+/-" || def === "×/÷" || def === "BLANK") await p.click(`[aria-label='Use ${c.value}']`);
  }
}

async function waitStatus(p: Page, text: string) {
  await p.waitForFunction((t) => document.querySelector("[data-testid='game-status']")?.textContent?.includes(t), text, { timeout: 10000 });
}

async function main() {
  const browser = await pw.chromium.launch({ args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] });
  const ctxA = await browser.newContext({ viewport: { width: 1440, height: 900 }, permissions: ["microphone"] });
  const ctxB = await browser.newContext({ viewport: { width: 1180, height: 820 }, permissions: ["microphone"] });
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  for (const p of [a, b]) p.on("pageerror", (e) => console.error("PAGE ERROR:", e.message));

  await a.goto(`${BASE}/`);
  await shot(a, "01-landing");
  await a.goto(`${BASE}/play`);
  await a.getByTestId("guest-btn").click();
  await a.getByTestId("review-room").waitFor();
  await shot(a, "02-create-room");
  await a.getByTestId("review-room").click();
  await a.getByTestId("create-room").click();
  await a.waitForURL(/\/room\//);
  const code = (await a.getByTestId("room-code").innerText()).trim().slice(0, 6);
  log("room", code);

  await b.goto(`${BASE}/room/${code}`);
  await b.getByTestId("guest-btn").click();
  await a.waitForFunction(() => !document.querySelector("[data-testid='start-game']")?.hasAttribute("disabled"));
  await shot(a, "03-waiting-room");
  await a.getByTestId("start-game").click();
  await a.getByTestId("game-status").waitFor();
  await b.getByTestId("game-status").waitFor();

  const aFirst = (await status(a)).includes("Your turn");
  let [first, second] = aFirst ? [a, b] : [b, a];
  log("starter is", aFirst ? "A" : "B");
  await shot(first, "04-game-start");

  // Voice chat: both join, a WebRTC peer connection must reach "connected".
  await a.getByRole("button", { name: "Join voice" }).click();
  await b.getByRole("button", { name: "Join voice" }).click();
  await a.waitForSelector("[data-testid='voice-chat'] span[title='connected']", { timeout: 15000 });
  await b.waitForSelector("[data-testid='voice-chat'] span[title='connected']", { timeout: 15000 });
  log("voice chat: peers connected over WebRTC");
  await b.getByRole("button", { name: "Mute" }).click();
  await a.waitForSelector("[data-testid='voice-chat'] span[title='connected'] svg.lucide-mic-off", { timeout: 5000 });
  log("voice chat: mute status propagated");

  // 1) Starter plays a deliberately WRONG equation.
  const bad = findFirstEquation(await rack(first), false, 3)!;
  await placeRow(first, bad);
  await shot(first, "05-move-preview");
  await first.getByTestId("submit-move").click();
  await first.getByTestId("confirm-submit").click();
  log("played (invalid on purpose):", bad.map((c) => c.value).join(" "));

  // 2) Opponent challenges.
  await second.getByTestId("challenge-window").waitFor();
  await shot(second, "06-challenge-window");
  await second.getByRole("button", { name: "Challenge" }).click();
  await second.getByRole("button", { name: "Yes, challenge" }).click();
  await first.getByTestId("challenge-result").waitFor();
  await shot(first, "07-challenge-result");
  await first.getByRole("button", { name: /^Accept/ }).click();
  await waitStatus(second, "Your turn");
  log("challenge upheld, tiles withdrawn");

  // 3) Find a player with a correct first equation (exchange and retry if a rack has none).
  let mover = second, waiter = first;
  for (let attempt = 0; ; attempt++) {
    const good = findFirstEquation(await rack(mover), true, 5);
    if (good) {
      await placeRow(mover, good);
      await mover.getByTestId("submit-move").click();
      await mover.getByTestId("confirm-submit").click();
      log("played:", good.map((c) => c.value).join(" "));
      break;
    }
    if (attempt > 8) throw new Error("no valid equation found after several exchanges");
    log("no equation in rack — exchanging");
    await mover.getByRole("button", { name: "Exchange" }).first().click();
    await mover.getByRole("dialog").getByRole("button", { name: "Select all" }).click();
    await mover.getByRole("dialog").getByRole("button", { name: /^Exchange \d/ }).click();
    await waitStatus(waiter, "Your turn");
    [mover, waiter] = [waiter, mover];
  }
  const moverIsA = mover === a;
  [first, second] = [waiter, mover];
  await first.getByTestId("challenge-window").waitFor();
  await first.getByRole("button", { name: "Accept move" }).click();
  await waitStatus(first, "Your turn");
  const sIdx = moverIsA ? 0 : 1;
  const score = Number(await first.getByTestId(`score-${sIdx}`).innerText());
  log("score after accepted move:", score);
  if (!(score > 0)) throw new Error("score not credited");
  await shot(first, "08-after-move");

  // 4) Three passes end the game.
  const pass = async (p: Page) => {
    await p.getByRole("button", { name: "Pass" }).first().click();
    await p.getByRole("dialog").getByRole("button", { name: "Pass" }).click();
  };
  await pass(first); await waitStatus(second, "Your turn");
  await pass(second); await waitStatus(first, "Your turn");
  await pass(first);
  await a.getByTestId("result-screen").waitFor();
  await b.getByTestId("result-screen").waitFor();
  await shot(a, "09-result");
  log("game over — result screen shown");

  // Mobile layout check
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const mp = await m.newPage();
  await mp.goto(`${BASE}/practice`);
  await mp.getByTestId("start-practice").click();
  await mp.waitForTimeout(500);
  await shot(mp, "10-mobile-practice");
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  log("mobile horizontal overflow:", overflow);
  await browser.close();
  if (overflow) process.exit(2);
}

main().catch((e) => { console.error(e); process.exit(1); });
