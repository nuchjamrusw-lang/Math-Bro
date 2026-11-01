/** Long-form rules content for the How to Play page, per language. */
import type { Lang } from "./index";

interface Content { title: string; subtitle: string; sections: { title: string; items: string[] }[]; squares: string; tiles: string; tilesSub: string; tryPractice: string; playOnline: string }

export const HOW_TO_PLAY: Record<Lang, Content> = {
  en: {
    title: "How to play A-Math",
    subtitle: "Everything you need to play your first game on Math&Bro.",
    squares: "Board squares",
    tiles: "The 100 tiles",
    tilesSub: "Small number = points · ×N = how many are in the bag.",
    tryPractice: "Try practice mode",
    playOnline: "Play online",
    sections: [
      { title: "Goal", items: [
        "Build correct equations on the 15×15 board, crossword-style, and score more points than your opponent.",
        "Every line of two or more touching tiles must be a correct equation.",
      ] },
      { title: "Starting the game", items: [
        "Each side draws one tile. The tile closest to 20 starts (BLANK beats everything; signs rank below 0). Ties draw again.",
        "The drawn tiles go back in the bag, then each side gets 8 tiles — the starter draws first.",
        "The first equation must be horizontal or vertical and cover the ★ center square.",
      ] },
      { title: "Making a move", items: [
        "Place one or more tiles in a single row or column with no gaps (gaps may be filled by tiles already on the board).",
        "At least one new tile must touch a tile already on the board (up, down, left or right).",
        "Every equation created or extended by the move must be correct — if one is wrong, the whole move is wrong.",
      ] },
      { title: "Math rules", items: [
        "× and ÷ come before + and −; operations of the same rank go left to right. 4 + 4 × 3 = 16.",
        "Join 2–3 single-digit tiles into one number (1 8 5 → 185). No leading zeros (07 is illegal). Tiles 10–20 cannot be joined with other numbers.",
        "A minus sign may make the first number of a side negative (−6 = 4 − 10). No +7, no −0, no two signs side by side.",
        "Never divide by 0 (0 ÷ 5 = 0 is fine). Fractions are exact: 2 ÷ 4 = 4 ÷ 8.",
        "Equations may chain several = signs (2 + 2 = 4 = 1 + 3).",
        "BLANK can be any number or sign (choose before playing) and is always worth 0. ± and ×/÷ tiles act as one of their two signs.",
      ] },
      { title: "Scoring", items: [
        "Each tile has its own points. New tiles on 2×/3× Piece squares multiply that tile.",
        "Add up all tiles in the equation, then multiply by any 2×/3× Equation squares covered by new tiles.",
        "Premium squares only count the first time a tile is placed on them.",
        "Use all 8 tiles in one move for a BINGO: +40 points.",
      ] },
      { title: "Exchange, pass & challenge", items: [
        "Exchange 1–8 tiles instead of playing (needs at least 5 tiles in the bag). It costs your turn.",
        "The game ends after 3 consecutive passes; each side loses its remaining rack points.",
        "Challenge ON: after a move, the opponent may challenge before touching their rack. Correct move → the challenger loses the turn. Wrong move → the tiles return and score 0. The losing side may ask for a re-challenge (referee or system second check).",
        "Strict mode: the system rejects incorrect equations before they are played.",
      ] },
      { title: "Time & end of game", items: [
        "Each side has its own chess clock (5, 12, 22 minutes or custom). Overtime costs 10 points per started minute (1 s → −10, 61 s → −20).",
        "When a player uses all their tiles and the bag is empty, they gain twice the opponent's remaining rack points (BLANK = 0).",
      ] },
    ],
  },
  th: {
    title: "วิธีเล่น A-Math",
    subtitle: "ทุกอย่างที่ต้องรู้ก่อนเริ่มเกมแรกบน Math&Bro",
    squares: "ช่องบนกระดาน",
    tiles: "เบี้ยทั้งหมด 100 ตัว",
    tilesSub: "ตัวเลขเล็ก = คะแนนของเบี้ย · ×N = จำนวนเบี้ยในถุง",
    tryPractice: "ลองโหมดฝึกซ้อม",
    playOnline: "เล่นออนไลน์",
    sections: [
      { title: "เป้าหมาย", items: [
        "ต่อสมการที่ถูกต้องบนกระดาน 15×15 แบบเดียวกับการต่อคำไขว้ และทำคะแนนให้มากกว่าคู่แข่ง",
        "ทุกแถวที่มีเบี้ยติดกันตั้งแต่ 2 ตัวขึ้นไป ต้องเป็นสมการที่ถูกต้อง",
      ] },
      { title: "การเริ่มเกม", items: [
        "แต่ละฝ่ายจับเบี้ย 1 ตัว เบี้ยที่ใกล้ 20 ที่สุดได้เริ่มก่อน (BLANK ใกล้ที่สุด ส่วนเครื่องหมายต่ำกว่า 0) ถ้าเท่ากันให้จับใหม่",
        "นำเบี้ยที่จับคืนถุง แล้วแจกฝ่ายละ 8 ตัว โดยฝ่ายที่เริ่มก่อนจับก่อน",
        "สมการแรกต้องวางแนวนอนหรือแนวตั้ง และต้องทับช่องดาว ★ กลางกระดาน",
      ] },
      { title: "การลงเบี้ย", items: [
        "วางเบี้ยตั้งแต่ 1 ตัวขึ้นไปในแถวเดียวหรือคอลัมน์เดียว ห้ามเว้นช่องว่าง (ช่องว่างเติมด้วยเบี้ยเดิมบนกระดานได้)",
        "เบี้ยใหม่อย่างน้อย 1 ตัวต้องติดกับเบี้ยเดิมบนกระดาน (บน ล่าง ซ้าย หรือขวา)",
        "ทุกสมการที่เกิดขึ้นหรือถูกต่อจากการลงครั้งนั้นต้องถูกต้อง ถ้าผิดแม้แต่สมการเดียว ถือว่าลงผิดทั้งหมด",
      ] },
      { title: "หลักคณิตศาสตร์", items: [
        "คูณและหารก่อนบวกและลบ ถ้าลำดับเท่ากันให้คิดจากซ้ายไปขวา เช่น 4 + 4 × 3 = 16",
        "ต่อเบี้ยเลขโดด 2–3 ตัวเป็นตัวเลขหลายหลักได้ (1 8 5 → 185) ห้ามมี 0 นำหน้า (07 ใช้ไม่ได้) เบี้ย 10–20 ต่อกับตัวเลขอื่นไม่ได้",
        "ใช้เครื่องหมายลบหน้าตัวเลขแรกของแต่ละข้างเพื่อทำเป็นจำนวนลบได้ (−6 = 4 − 10) ห้ามใช้ +7 ห้ามใช้ −0 และห้ามวางเครื่องหมายติดกัน",
        "ห้ามหารด้วย 0 (แต่ 0 ÷ 5 = 0 ได้) เศษส่วนคิดแบบแม่นยำ เช่น 2 ÷ 4 = 4 ÷ 8",
        "สมการมีเครื่องหมาย = หลายตัวต่อกันได้ (2 + 2 = 4 = 1 + 3)",
        "BLANK ใช้แทนตัวเลขหรือเครื่องหมายใดก็ได้ (เลือกก่อนลง) และมีคะแนน 0 เสมอ ส่วนเบี้ย ± และ ×/÷ ใช้เป็นเครื่องหมายได้อย่างใดอย่างหนึ่ง",
      ] },
      { title: "การคิดคะแนน", items: [
        "เบี้ยแต่ละตัวมีคะแนนประจำตัว เบี้ยใหม่ที่ลงบนช่องเบี้ย ×2 หรือ ×3 จะคูณคะแนนเฉพาะตัวนั้น",
        "รวมคะแนนเบี้ยทั้งสมการ แล้วคูณด้วยช่องสมการ ×2 หรือ ×3 ที่เบี้ยใหม่ลงทับ",
        "ช่องพิเศษใช้ได้เฉพาะครั้งแรกที่มีเบี้ยลงทับเท่านั้น",
        "ใช้เบี้ยครบ 8 ตัวในตาเดียวได้บิงโก: +40 คะแนน",
      ] },
      { title: "เปลี่ยนเบี้ย ผ่าน และชาเล้นจ์", items: [
        "เปลี่ยนเบี้ยได้ 1–8 ตัวแทนการลง (ต้องมีเบี้ยในถุงอย่างน้อย 5 ตัว) และเสียตานั้น",
        "เกมจบเมื่อผ่านติดกัน 3 ครั้ง แต่ละฝ่ายถูกหักคะแนนเบี้ยที่เหลือในมือ",
        "เปิดชาเล้นจ์: หลังอีกฝ่ายลงสมการ เราชาเล้นจ์ได้ก่อนจับเบี้ยบนแป้น ถ้าสมการถูก ผู้ชาเล้นจ์เสียตา ถ้าสมการผิด ผู้ลงต้องเก็บเบี้ยคืนและได้ 0 คะแนน ฝ่ายที่แพ้ขอรีชาเล้นจ์ได้ (กรรมการหรือระบบตรวจครั้งที่ 2)",
        "โหมดเข้มงวด: ระบบไม่อนุญาตให้ลงสมการที่ผิด",
      ] },
      { title: "เวลาและการจบเกม", items: [
        "แต่ละฝ่ายมีนาฬิกาของตัวเอง (5, 12, 22 นาที หรือกำหนดเอง) เวลาเกินหัก 10 คะแนนต่อนาที เศษวินาทีปัดขึ้น (เกิน 1 วิ → −10, 61 วิ → −20)",
        "เมื่อผู้เล่นลงเบี้ยหมดและถุงว่าง จะได้คะแนนเพิ่ม 2 เท่าของคะแนนเบี้ยที่เหลือในมือคู่แข่ง (BLANK = 0)",
      ] },
    ],
  },
  zh: {
    title: "A-Math 玩法说明",
    subtitle: "在 Math&Bro 开始第一局前需要知道的一切。",
    squares: "棋盘格子",
    tiles: "全部 100 张牌",
    tilesSub: "小数字 = 牌的分数 · ×N = 牌袋中的数量",
    tryPractice: "试试练习模式",
    playOnline: "在线对战",
    sections: [
      { title: "目标", items: [
        "像填字游戏一样在 15×15 棋盘上拼出正确的等式，得分超过对手。",
        "棋盘上两张及以上相连的牌，每一行或每一列都必须是正确的等式。",
      ] },
      { title: "开局", items: [
        "双方各抽 1 张牌，最接近 20 的一方先手（BLANK 最大；符号低于 0）。相同则重抽。",
        "抽出的牌放回牌袋，然后每方发 8 张牌，先手方先摸。",
        "第一个等式必须横放或竖放，并覆盖中心的 ★ 星格。",
      ] },
      { title: "出牌", items: [
        "把一张或多张牌放在同一行或同一列，中间不能留空（空位可以由棋盘上已有的牌补上）。",
        "至少一张新牌必须与棋盘上已有的牌上下左右相邻。",
        "这一步形成或延长的每个等式都必须正确 — 只要有一个错误，整步无效。",
      ] },
      { title: "数学规则", items: [
        "先乘除后加减；同级运算从左到右。4 + 4 × 3 = 16。",
        "可以把 2–3 张个位数牌连成多位数（1 8 5 → 185）。不能以 0 开头（07 无效）。10–20 的牌不能与其他数字相连。",
        "每边的第一个数字前可以加负号表示负数（−6 = 4 − 10）。不能用 +7、−0，也不能两个符号相邻。",
        "不能除以 0（0 ÷ 5 = 0 可以）。分数精确计算：2 ÷ 4 = 4 ÷ 8。",
        "等式可以连续使用多个 = 号（2 + 2 = 4 = 1 + 3）。",
        "BLANK 可以代表任意数字或符号（出牌前选择），始终计 0 分。± 和 ×/÷ 牌可作为其中一种符号。",
      ] },
      { title: "计分", items: [
        "每张牌有自己的分数。新牌放在 2 倍/3 倍牌分格上时，该牌分数加倍。",
        "把等式中所有牌的分数相加，再乘以新牌覆盖的 2 倍/3 倍等式格。",
        "加分格只在第一次有牌放上时生效。",
        "一步用完全部 8 张牌即为 BINGO：+40 分。",
      ] },
      { title: "换牌、跳过与挑战", items: [
        "可以用 1–8 张牌换牌代替出牌（牌袋中至少要有 5 张），会失去本回合。",
        "连续跳过 3 次后对局结束，每方扣除手中剩余牌的分数。",
        "开启挑战：对手出牌后，你可以在动牌架之前发起挑战。等式正确 → 挑战者失去本回合；等式错误 → 对手收回牌且得 0 分。失利一方可以请求再次挑战（由裁判或系统第二次检查）。",
        "严格模式：系统不允许打出错误的等式。",
      ] },
      { title: "时间与结束", items: [
        "每方有自己的棋钟（5、12、22 分钟或自定义）。超时每分钟扣 10 分，不足一分钟按一分钟计（超 1 秒 → −10，超 61 秒 → −20）。",
        "当一方用完所有牌且牌袋已空时，获得对手剩余牌分数的 2 倍（BLANK = 0）。",
      ] },
    ],
  },
};
