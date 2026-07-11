# 第七届总选举 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use $superpower-subagents (recommended) or $superpower-executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking via update_plan.

**Goal:** 为 29 位在籍成员写入第七届顺位，在总选页展示第 1–21 位与「一途なる想い」，并永久锁定本届公式照版本。

**Architecture:** 选举结果和照片快照继续随成员保存在 `electionRanks` 中，新增可选的 `photoVersion`。一个独立纯函数按快照版本解析照片 URL；旧届没有快照时继续调用既有届次档位逻辑。

**Tech Stack:** React 19、Vite 7、Node.js `node:test`、JSON 数据文件。

---

## 文件结构

- Create: `src/lib/electionPhotos.js` — 纯函数解析选举记录锁定的公式照。
- Create: `src/lib/electionPhotos.test.js` — 公式照锁定与旧数据回退测试。
- Create: `src/lib/seventhElectionData.test.js` — 校验第七届 29 人数据、顺位、分圈和快照完整性。
- Create: `src/lib/electionPageSource.test.js` — 校验页面副标题和快照解析接线。
- Modify: `src/App.jsx` — 新增副标题并在总选列表接入快照解析。
- Modify: `server/data/db.json` — 给 29 位在籍成员追加第七届顺位及当前照片版本。

### Task 1: 公式照快照解析

**Files:**
- Create: `src/lib/electionPhotos.test.js`
- Create: `src/lib/electionPhotos.js`

- [ ] **Step 1: 写失败测试**

测试 `getElectionPhotoUrl(member, entry, fallbackTier)`：当 `entry.photoVersion` 存在时按 `officialPhotos[].version` 精确取图；追加更高版本后返回值不变；版本缺失时调用旧的档位规则回退；无照片时回退 `avatar`。

- [ ] **Step 2: 验证 RED**

Run: `node --test src/lib/electionPhotos.test.js`

Expected: FAIL，提示 `electionPhotos.js` 或导出函数不存在。

- [ ] **Step 3: 写最小实现**

```js
export function getElectionPhotoUrl(member, electionEntry, fallbackTier = 0) {
  const photos = Array.isArray(member?.officialPhotos) ? member.officialPhotos : [];
  const lockedVersion = Number(electionEntry?.photoVersion);
  if (Number.isFinite(lockedVersion)) {
    const locked = photos.find((photo) => Number(photo?.version) === lockedVersion);
    if (locked?.url) return locked.url;
  }
  if (photos.length === 0) return member?.avatar ?? "";
  if (fallbackTier >= 2 && photos.length >= 2) return photos[photos.length - 1].url;
  if (fallbackTier >= 1 && photos.length >= 2) return photos[1].url;
  return photos[0].url;
}
```

- [ ] **Step 4: 验证 GREEN**

Run: `node --test src/lib/electionPhotos.test.js`

Expected: PASS。

### Task 2: 第七届数据约束与数据写入

**Files:**
- Create: `src/lib/seventhElectionData.test.js`
- Modify: `server/data/db.json`

- [ ] **Step 1: 写失败测试**

读取 `server/data/db.json` 并断言：恰有 29 位在籍成员；每位恰有一条第七届记录；毕业成员无第七届记录；顺位恰为 1–29；顺位到成员 ID 的映射与用户榜单一致；每条 `photoVersion` 等于写入前该成员 `officialPhotos` 的最高版本。

- [ ] **Step 2: 验证 RED**

Run: `node --test src/lib/seventhElectionData.test.js`

Expected: FAIL，提示缺少第七届记录。

- [ ] **Step 3: 写入最小数据变更**

按确认榜单给对应成员的 `electionRanks` 末尾追加：

记录统一使用 `{ "edition": "第7届", "rank": "第1位" ... "第29位", "photoVersion": 1|2|3 }` 形状；`rank` 严格按用户给出的 1–29 顺序写入。

其中 `photoVersion` 使用各成员当前最高版本：十期与九期为 1；西野咲彩为 2；其余成员按当前数据多数为 3，并以测试读取到的实际最高版本为准。

- [ ] **Step 4: 验证 GREEN**

Run: `node --test src/lib/seventhElectionData.test.js`

Expected: PASS，29 条记录、29 个唯一顺位、无毕业成员记录。

### Task 3: 总选页面接线与副标题

**Files:**
- Create: `src/lib/electionPageSource.test.js`
- Modify: `src/App.jsx`

- [ ] **Step 1: 写失败测试**

读取 `src/App.jsx` 并断言源码包含 `"第7届": "一途なる想い"`、导入 `getElectionPhotoUrl`，且总选头像调用传入 `member`、`entry` 与当前届回退档位。

- [ ] **Step 2: 验证 RED**

Run: `node --test src/lib/electionPageSource.test.js`

Expected: FAIL，提示缺少第七届副标题或快照函数接线。

- [ ] **Step 3: 接入页面**

在 `src/App.jsx`：

```js
import { getElectionPhotoUrl } from "./lib/electionPhotos.js";
```

向 `ELECTION_SUBTITLES` 添加 `"第7届": "一途なる想い"`；构造总选 `rows` 时保留完整 `entry`；渲染头像时调用：

```jsx
getElectionPhotoUrl(member, entry, getEditionPhotoTier(activeEdition))
```

其余阈值逻辑保持不变，因此第七届自动只显示第 1–21 位。

- [ ] **Step 4: 验证单元测试**

Run: `node --test src/lib/electionPhotos.test.js src/lib/seventhElectionData.test.js src/lib/electionPageSource.test.js`

Expected: 全部 PASS。

### Task 4: 完整验证

**Files:**
- Verify only

- [ ] **Step 1: 运行全部现有单元测试**

Run: `node --test src/lib/*.test.js`

Expected: 全部 PASS。

- [ ] **Step 2: 运行 lint**

Run: `npm run lint`

Expected: 无新增 lint 错误；如仓库已有错误，记录与本次改动无关的基线。

- [ ] **Step 3: 运行生产构建**

Run: `npm run build`

Expected: Vite 构建成功。

- [ ] **Step 4: 数据与差异复核**

Run: `git diff --check && git diff -- src/App.jsx src/lib/electionPhotos.js src/lib/electionPhotos.test.js src/lib/seventhElectionData.test.js server/data/db.json`

Expected: 无空白错误；仅包含第七届数据、快照辅助函数、页面接线和测试，不覆盖用户在 `db.json` 中的其他未提交修改。
