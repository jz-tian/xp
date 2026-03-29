# 九期生加入 & Badge 白字化 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 向数据库添加6位九期生完整数据，前端 GENERATION_THEME 新增9期主题色、修正2/4/5/6期为白字。

**Architecture:** 两个独立变更：(1) `src/App.jsx` 中5行 GENERATION_THEME 修改；(2) `server/data/db.json` 末尾追加6个成员对象。无新组件，现有 badge/filter 逻辑自动适配9期。

**Tech Stack:** React 19, Vite 7, Tailwind CSS v4, plain JSON 数据库

---

## Task 1: 修改 GENERATION_THEME，统一白字并新增9期

**Files:**
- Modify: `src/App.jsx:479-488`

- [ ] **Step 1: 定位 GENERATION_THEME 并替换**

找到 `src/App.jsx` 第 479 行的 `const GENERATION_THEME`，将整个对象替换为：

```js
const GENERATION_THEME = {
  "1": { backgroundColor: "#E78BA8", color: "#FFFFFF", borderColor: "#E78BA8" },
  "2": { backgroundColor: "#63EA95", color: "#FFFFFF", borderColor: "#63EA95" },
  "3": { backgroundColor: "#00A8E7", color: "#FFFFFF", borderColor: "#00A8E7" },
  "4": { backgroundColor: "#F8FD01", color: "#FFFFFF", borderColor: "#F8FD01" },
  "5": { backgroundColor: "#FDA40C", color: "#FFFFFF", borderColor: "#FDA40C" },
  "6": { backgroundColor: "#DCC8E1", color: "#FFFFFF", borderColor: "#DCC8E1" },
  "7": { backgroundColor: "#2F7927", color: "#FFFFFF", borderColor: "#2F7927" },
  "8": { backgroundColor: "#3098FE", color: "#FFFFFF", borderColor: "#3098FE" },
  "9": { backgroundColor: "#3CC2B1", color: "#FFFFFF", borderColor: "#3CC2B1" },
};
```

- [ ] **Step 2: 验证页面渲染**

启动开发服务器（`npm run dev`），打开成员页面，确认2期/4期/5期/6期/9期 badge 均为白字。（9期此时无成员，可在筛选 pill 上看到期数 pill 出现后确认色。）

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat: add 9th gen theme color and unify generation badges to white text"
```

---

## Task 2: 向 db.json 添加六位九期生

**Files:**
- Modify: `server/data/db.json` — `members` 数组末尾

**说明：** 所有九期生的 `selectionHistory` 包含全部36个单曲 ID，值全为 `"加入前"`；`electionRanks` 包含第1–5届，值全为 `"加入前"`；`avatar`/`officialPhotos` 留空。

- [ ] **Step 1: 在 `members` 数组末尾追加久城泪**

```json
{
  "id": "m_9gen_1",
  "name": "久城 泪",
  "romaji": "NAMIDA HISHIRO",
  "origin": "北海道・函馆",
  "generation": "9期",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "electionRanks": [
    { "edition": "第1届", "rank": "加入前" },
    { "edition": "第2届", "rank": "加入前" },
    { "edition": "第3届", "rank": "加入前" },
    { "edition": "第4届", "rank": "加入前" },
    { "edition": "第5届", "rank": "加入前" }
  ],
  "admireSenior": ["m_mdv7k6ml", "m_batr9qfj"],
  "friends": ["m_9gen_2", "m_9gen_3", "m_9gen_4", "m_9gen_5", "m_9gen_6"],
  "favoriteSong": "Frozen Silence（黑米 薰 solo）",
  "favoriteSongs": [
    "Frozen Silence（黑米 薰 solo）",
    "半透明的夏日",
    "雨夜镜中人"
  ],
  "profile": {
    "height": "157cm",
    "birthday": "2010-04-19",
    "blood": "B",
    "hobby": "深夜独自去废弃建筑拍照，专拍锈迹与蜘蛛网",
    "skill": "能在五秒内把笑容切换成令人窒息的忧郁眼神",
    "catchphrase": "哭是一种美，所以泪是我的名字。"
  },
  "selectionHistory": {
    "s1": "加入前", "s2": "加入前",
    "s_oq7izq79": "加入前", "s_7kxfyxh0": "加入前", "s_bnwbmbn8": "加入前",
    "s_bpiozglx": "加入前", "s_hwxadq52": "加入前", "s_dmv6qfio": "加入前",
    "s_0k9y573f": "加入前", "s_awspexel": "加入前", "s_ycgqt5ej": "加入前",
    "s_awixwkeo": "加入前", "s_p3pegbk7": "加入前", "s_updsfvcu": "加入前",
    "s_vq925yfe": "加入前", "s_xt9tskmx": "加入前", "s_c5rwv332": "加入前",
    "s_zr2um0s2": "加入前", "s_2584nm99": "加入前", "s_ng2yeb1e": "加入前",
    "s_vh9w6l9m": "加入前", "s_1qjvgq11": "加入前", "s_syvyq01g": "加入前",
    "s_3zj3ezmq": "加入前", "s_rxq55d2c": "加入前", "s_pw9b7nha": "加入前",
    "s_oey99lit": "加入前", "s_4ofhpcr1": "加入前", "s_z8u6w72c": "加入前",
    "s_pbzdfn3u": "加入前", "s_15hm6il2": "加入前", "s_6k83o27r": "加入前",
    "s_nfyjq9j3": "加入前", "s_uftxjn6a": "加入前", "s_arraomx5": "加入前",
    "s_phyou9mt": "加入前"
  },
  "favoritePokemon": 197
}
```

- [ ] **Step 2: 追加空港树绘华**

```json
{
  "id": "m_9gen_2",
  "name": "空港 树绘华",
  "romaji": "KIEHANA KUKO",
  "origin": "冲绳・那霸",
  "generation": "9期",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "electionRanks": [
    { "edition": "第1届", "rank": "加入前" },
    { "edition": "第2届", "rank": "加入前" },
    { "edition": "第3届", "rank": "加入前" },
    { "edition": "第4届", "rank": "加入前" },
    { "edition": "第5届", "rank": "加入前" }
  ],
  "admireSenior": ["m_jh2ureo3", "m_saki"],
  "friends": ["m_9gen_1", "m_9gen_3", "m_9gen_4", "m_9gen_5", "m_9gen_6"],
  "favoriteSong": "Summer Runway（饭锅 利佳 center）",
  "favoriteSongs": [
    "Summer Runway（饭锅 利佳 center）",
    "波纹之外",
    "起飞前三分钟"
  ],
  "profile": {
    "height": "163cm",
    "birthday": "2010-07-24",
    "blood": "O",
    "hobby": "冲浪，并把每次乘浪的秒数换算成可以飞多远的航程",
    "skill": "一边滑行一边背出当天航班时刻表不出差错",
    "catchphrase": "天空再高，我也能起跳！"
  },
  "selectionHistory": {
    "s1": "加入前", "s2": "加入前",
    "s_oq7izq79": "加入前", "s_7kxfyxh0": "加入前", "s_bnwbmbn8": "加入前",
    "s_bpiozglx": "加入前", "s_hwxadq52": "加入前", "s_dmv6qfio": "加入前",
    "s_0k9y573f": "加入前", "s_awspexel": "加入前", "s_ycgqt5ej": "加入前",
    "s_awixwkeo": "加入前", "s_p3pegbk7": "加入前", "s_updsfvcu": "加入前",
    "s_vq925yfe": "加入前", "s_xt9tskmx": "加入前", "s_c5rwv332": "加入前",
    "s_zr2um0s2": "加入前", "s_2584nm99": "加入前", "s_ng2yeb1e": "加入前",
    "s_vh9w6l9m": "加入前", "s_1qjvgq11": "加入前", "s_syvyq01g": "加入前",
    "s_3zj3ezmq": "加入前", "s_rxq55d2c": "加入前", "s_pw9b7nha": "加入前",
    "s_oey99lit": "加入前", "s_4ofhpcr1": "加入前", "s_z8u6w72c": "加入前",
    "s_pbzdfn3u": "加入前", "s_15hm6il2": "加入前", "s_6k83o27r": "加入前",
    "s_nfyjq9j3": "加入前", "s_uftxjn6a": "加入前", "s_arraomx5": "加入前",
    "s_phyou9mt": "加入前"
  },
  "favoritePokemon": 277
}
```

- [ ] **Step 3: 追加山本喜月**

```json
{
  "id": "m_9gen_3",
  "name": "山本 喜月",
  "romaji": "KITSUKI YAMAMOTO",
  "origin": "京都・西京区",
  "generation": "9期",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "electionRanks": [
    { "edition": "第1届", "rank": "加入前" },
    { "edition": "第2届", "rank": "加入前" },
    { "edition": "第3届", "rank": "加入前" },
    { "edition": "第4届", "rank": "加入前" },
    { "edition": "第5届", "rank": "加入前" }
  ],
  "admireSenior": ["m_rjli97s6", "m_ltlzffea"],
  "friends": ["m_9gen_1", "m_9gen_2", "m_9gen_4", "m_9gen_5", "m_9gen_6"],
  "favoriteSong": "春草烟（小林 凛凛花 center）",
  "favoriteSongs": [
    "春草烟（小林 凛凛花 center）",
    "深夜书架",
    "京都雨季"
  ],
  "profile": {
    "height": "162cm",
    "birthday": "2010-01-08",
    "blood": "A",
    "hobby": "把读过的书按心情颜色重新排列书架，每周更换一次配色",
    "skill": "用《源氏物语》原文即兴点评当天天气，三年无重复句",
    "catchphrase": "月亮是书签，我永远记得翻到哪里。"
  },
  "selectionHistory": {
    "s1": "加入前", "s2": "加入前",
    "s_oq7izq79": "加入前", "s_7kxfyxh0": "加入前", "s_bnwbmbn8": "加入前",
    "s_bpiozglx": "加入前", "s_hwxadq52": "加入前", "s_dmv6qfio": "加入前",
    "s_0k9y573f": "加入前", "s_awspexel": "加入前", "s_ycgqt5ej": "加入前",
    "s_awixwkeo": "加入前", "s_p3pegbk7": "加入前", "s_updsfvcu": "加入前",
    "s_vq925yfe": "加入前", "s_xt9tskmx": "加入前", "s_c5rwv332": "加入前",
    "s_zr2um0s2": "加入前", "s_2584nm99": "加入前", "s_ng2yeb1e": "加入前",
    "s_vh9w6l9m": "加入前", "s_1qjvgq11": "加入前", "s_syvyq01g": "加入前",
    "s_3zj3ezmq": "加入前", "s_rxq55d2c": "加入前", "s_pw9b7nha": "加入前",
    "s_oey99lit": "加入前", "s_4ofhpcr1": "加入前", "s_z8u6w72c": "加入前",
    "s_pbzdfn3u": "加入前", "s_15hm6il2": "加入前", "s_6k83o27r": "加入前",
    "s_nfyjq9j3": "加入前", "s_uftxjn6a": "加入前", "s_arraomx5": "加入前",
    "s_phyou9mt": "加入前"
  },
  "favoritePokemon": 196
}
```

- [ ] **Step 4: 追加神崎百花**

```json
{
  "id": "m_9gen_4",
  "name": "神崎 百花",
  "romaji": "MOMOKA KANZAKI",
  "origin": "大阪・难波",
  "generation": "9期",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "electionRanks": [
    { "edition": "第1届", "rank": "加入前" },
    { "edition": "第2届", "rank": "加入前" },
    { "edition": "第3届", "rank": "加入前" },
    { "edition": "第4届", "rank": "加入前" },
    { "edition": "第5届", "rank": "加入前" }
  ],
  "admireSenior": ["m_gbojk371", "m_akari"],
  "friends": ["m_9gen_1", "m_9gen_2", "m_9gen_3", "m_9gen_5", "m_9gen_6"],
  "favoriteSong": "Laugh Track（宫岛 阿弥 center）",
  "favoriteSongs": [
    "Laugh Track（宫岛 阿弥 center）",
    "难波阵风",
    "大声的理由"
  ],
  "profile": {
    "height": "156cm",
    "birthday": "2010-09-03",
    "blood": "O",
    "hobby": "每天用一句话记录当天遇到的最离谱的事，已积累三年",
    "skill": "三秒内模仿出任何人说话的口癖与节奏",
    "catchphrase": "百花盛开，所以我不挑场合绽放！"
  },
  "selectionHistory": {
    "s1": "加入前", "s2": "加入前",
    "s_oq7izq79": "加入前", "s_7kxfyxh0": "加入前", "s_bnwbmbn8": "加入前",
    "s_bpiozglx": "加入前", "s_hwxadq52": "加入前", "s_dmv6qfio": "加入前",
    "s_0k9y573f": "加入前", "s_awspexel": "加入前", "s_ycgqt5ej": "加入前",
    "s_awixwkeo": "加入前", "s_p3pegbk7": "加入前", "s_updsfvcu": "加入前",
    "s_vq925yfe": "加入前", "s_xt9tskmx": "加入前", "s_c5rwv332": "加入前",
    "s_zr2um0s2": "加入前", "s_2584nm99": "加入前", "s_ng2yeb1e": "加入前",
    "s_vh9w6l9m": "加入前", "s_1qjvgq11": "加入前", "s_syvyq01g": "加入前",
    "s_3zj3ezmq": "加入前", "s_rxq55d2c": "加入前", "s_pw9b7nha": "加入前",
    "s_oey99lit": "加入前", "s_4ofhpcr1": "加入前", "s_z8u6w72c": "加入前",
    "s_pbzdfn3u": "加入前", "s_15hm6il2": "加入前", "s_6k83o27r": "加入前",
    "s_nfyjq9j3": "加入前", "s_uftxjn6a": "加入前", "s_arraomx5": "加入前",
    "s_phyou9mt": "加入前"
  },
  "favoritePokemon": 235
}
```

- [ ] **Step 5: 追加西園寺莉央**

```json
{
  "id": "m_9gen_5",
  "name": "西園寺 莉央",
  "romaji": "RIO SAIONJI",
  "origin": "东京・港区",
  "generation": "9期",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "electionRanks": [
    { "edition": "第1届", "rank": "加入前" },
    { "edition": "第2届", "rank": "加入前" },
    { "edition": "第3届", "rank": "加入前" },
    { "edition": "第4届", "rank": "加入前" },
    { "edition": "第5届", "rank": "加入前" }
  ],
  "admireSenior": ["m_ff4lppj9", "m_m8fltj0e"],
  "friends": ["m_9gen_1", "m_9gen_2", "m_9gen_3", "m_9gen_4", "m_9gen_6"],
  "favoriteSong": "月夜奏鸣曲（长谷川 玲奈 center）",
  "favoriteSongs": [
    "月夜奏鸣曲（长谷川 玲奈 center）",
    "钢琴与寂静",
    "港区的月亮"
  ],
  "profile": {
    "height": "165cm",
    "birthday": "2009-12-30",
    "blood": "AB",
    "hobby": "学习古典钢琴，且只在深夜一个人弹，从不录音",
    "skill": "进任何房间十秒内，全场气氛会自动安静下来",
    "catchphrase": "优雅不是装出来的，是你们看不见的那部分。"
  },
  "selectionHistory": {
    "s1": "加入前", "s2": "加入前",
    "s_oq7izq79": "加入前", "s_7kxfyxh0": "加入前", "s_bnwbmbn8": "加入前",
    "s_bpiozglx": "加入前", "s_hwxadq52": "加入前", "s_dmv6qfio": "加入前",
    "s_0k9y573f": "加入前", "s_awspexel": "加入前", "s_ycgqt5ej": "加入前",
    "s_awixwkeo": "加入前", "s_p3pegbk7": "加入前", "s_updsfvcu": "加入前",
    "s_vq925yfe": "加入前", "s_xt9tskmx": "加入前", "s_c5rwv332": "加入前",
    "s_zr2um0s2": "加入前", "s_2584nm99": "加入前", "s_ng2yeb1e": "加入前",
    "s_vh9w6l9m": "加入前", "s_1qjvgq11": "加入前", "s_syvyq01g": "加入前",
    "s_3zj3ezmq": "加入前", "s_rxq55d2c": "加入前", "s_pw9b7nha": "加入前",
    "s_oey99lit": "加入前", "s_4ofhpcr1": "加入前", "s_z8u6w72c": "加入前",
    "s_pbzdfn3u": "加入前", "s_15hm6il2": "加入前", "s_6k83o27r": "加入前",
    "s_nfyjq9j3": "加入前", "s_uftxjn6a": "加入前", "s_arraomx5": "加入前",
    "s_phyou9mt": "加入前"
  },
  "favoritePokemon": 350
}
```

- [ ] **Step 6: 追加最上芽衣**

```json
{
  "id": "m_9gen_6",
  "name": "最上 芽衣",
  "romaji": "MEI MOGAMI",
  "origin": "山形・米泽",
  "generation": "9期",
  "avatar": "",
  "officialPhotos": [],
  "isActive": true,
  "graduationDate": "",
  "graduationSongTitle": "",
  "electionRanks": [
    { "edition": "第1届", "rank": "加入前" },
    { "edition": "第2届", "rank": "加入前" },
    { "edition": "第3届", "rank": "加入前" },
    { "edition": "第4届", "rank": "加入前" },
    { "edition": "第5届", "rank": "加入前" }
  ],
  "admireSenior": ["m_ys0s465i", "m_ayame"],
  "friends": ["m_9gen_1", "m_9gen_2", "m_9gen_3", "m_9gen_4", "m_9gen_5"],
  "favoriteSong": "田间的风（小泉 洋子 center）",
  "favoriteSongs": [
    "田间的风（小泉 洋子 center）",
    "米泽初雪",
    "草地地图"
  ],
  "profile": {
    "height": "160cm",
    "birthday": "2010-03-07",
    "blood": "A",
    "hobby": "在草地上画地图然后把遇到的虫子当居民，给它们取名字",
    "skill": "一分钟内叫出任何品种猫咪的正式学名，含亚种",
    "catchphrase": "发芽的地方就是家，我随时准备扎根。"
  },
  "selectionHistory": {
    "s1": "加入前", "s2": "加入前",
    "s_oq7izq79": "加入前", "s_7kxfyxh0": "加入前", "s_bnwbmbn8": "加入前",
    "s_bpiozglx": "加入前", "s_hwxadq52": "加入前", "s_dmv6qfio": "加入前",
    "s_0k9y573f": "加入前", "s_awspexel": "加入前", "s_ycgqt5ej": "加入前",
    "s_awixwkeo": "加入前", "s_p3pegbk7": "加入前", "s_updsfvcu": "加入前",
    "s_vq925yfe": "加入前", "s_xt9tskmx": "加入前", "s_c5rwv332": "加入前",
    "s_zr2um0s2": "加入前", "s_2584nm99": "加入前", "s_ng2yeb1e": "加入前",
    "s_vh9w6l9m": "加入前", "s_1qjvgq11": "加入前", "s_syvyq01g": "加入前",
    "s_3zj3ezmq": "加入前", "s_rxq55d2c": "加入前", "s_pw9b7nha": "加入前",
    "s_oey99lit": "加入前", "s_4ofhpcr1": "加入前", "s_z8u6w72c": "加入前",
    "s_pbzdfn3u": "加入前", "s_15hm6il2": "加入前", "s_6k83o27r": "加入前",
    "s_nfyjq9j3": "加入前", "s_uftxjn6a": "加入前", "s_arraomx5": "加入前",
    "s_phyou9mt": "加入前"
  },
  "favoritePokemon": 470
}
```

- [ ] **Step 7: 验证 JSON 合法性**

```bash
node -e "
const db = require('./server/data/db.json');
const ninthGen = db.members.filter(m => m.generation === '9期');
console.log('9期成员数:', ninthGen.length);
ninthGen.forEach(m => {
  const selCount = Object.keys(m.selectionHistory).length;
  console.log(m.name, '| selectionHistory keys:', selCount, '| electionRanks:', m.electionRanks.length);
});
"
```

期望输出：
```
9期成员数: 6
久城 泪 | selectionHistory keys: 36 | electionRanks: 5
空港 树绘华 | selectionHistory keys: 36 | electionRanks: 5
山本 喜月 | selectionHistory keys: 36 | electionRanks: 5
神崎 百花 | selectionHistory keys: 36 | electionRanks: 5
西園寺 莉央 | selectionHistory keys: 36 | electionRanks: 5
最上 芽衣 | selectionHistory keys: 36 | electionRanks: 5
```

- [ ] **Step 8: 启动服务，确认9期生在成员页面可见**

启动前端（`npm run dev`）和后端（`node server/index.js` 或项目的启动命令），打开成员页面：
- 筛选 pill 中出现 "9期" 且颜色为 `#3CC2B1` 白字
- 6位成员出现在成员格中，点开详情页可看到 PROFILE、ELECTION（全部加入前）、DISCOGRAPHY（全部加入前）

- [ ] **Step 9: Commit**

```bash
git add server/data/db.json
git commit -m "feat: add 6 ninth-generation members to database"
```

---

## Task 3: 更新 CLAUDE.md 中 Generation Badge Colors 表格

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 更新 Generation Badge Colors 章节**

找到 CLAUDE.md 中的 `### Generation Badge Colors` 表格，替换为：

```markdown
### Generation Badge Colors
| Generation | Background | Text |
|---|---|---|
| 1期 | `#E78BA8` | `#FFFFFF` |
| 2期 | `#63EA95` | `#FFFFFF` |
| 3期 | `#00A8E7` | `#FFFFFF` |
| 4期 | `#F8FD01` | `#FFFFFF` |
| 5期 | `#FDA40C` | `#FFFFFF` |
| 6期 | `#DCC8E1` | `#FFFFFF` |
| 7期 | `#2F7927` | `#FFFFFF` |
| 8期 | `#3098FE` | `#FFFFFF` |
| 9期 | `#3CC2B1` | `#FFFFFF` |
All badges: `padding: '2px 8px', fontWeight: 500, fontSize: '10px', letterSpacing: '0.04em'`
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update generation badge colors table for white text unification and add 9th gen"
```
