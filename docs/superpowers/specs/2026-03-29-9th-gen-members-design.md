# 九期生成员加入 & 期数 Badge 白字化 — 设计文档

**日期**: 2026-03-29
**状态**: 已批准，待实现

---

## 一、目标

1. 向 `server/data/db.json` 添加 6 位九期生成员完整数据（不含公式照）
2. 前端 `src/App.jsx` 的 `GENERATION_THEME` 中：
   - 2期、4期、5期、6期 颜色改为白字
   - 新增 9期主题色 `#3CC2B1`（白字）
3. 现有所有调用 `generationBadgeClass` / `generationBadgeStyle` / `generationFilterStyle` 的地方自动生效，无需额外改动

---

## 二、前端变更：GENERATION_THEME

**文件**: `src/App.jsx`，`const GENERATION_THEME` 对象（约第 479 行）

| 期数 | 现状 | 变更 |
|------|------|------|
| 2期 `#63EA95` | `color: "#111111"` | → `color: "#FFFFFF"` |
| 4期 `#F8FD01` | `color: "#111111"` | → `color: "#FFFFFF"` |
| 5期 `#FDA40C` | `color: "#111111"` | → `color: "#FFFFFF"` |
| 6期 `#DCC8E1` | `color: "#111111"` | → `color: "#FFFFFF"` |
| 9期（新增）| — | `{ backgroundColor: "#3CC2B1", color: "#FFFFFF", borderColor: "#3CC2B1" }` |

CLAUDE.md 中的 Generation Badge Colors 表格也需同步更新，加入 9期行、修正 2/4/5/6 期文字色。

---

## 三、后端变更：六位九期生数据

**文件**: `server/data/db.json`，`members` 数组末尾追加

### 通用规则
- `generation`: `"9期"`
- `isActive`: `true`
- `graduationDate` / `graduationSongTitle`: 空字符串
- `avatar` / `officialPhotos`: 空（`""` / `[]`）
- `selectionHistory`: 全部 36 个单曲 ID 值为 `"加入前"`
- `electionRanks`: 第1–5届全为 `"加入前"`

### 成员详情

#### 1. 久城泪 `m_9gen_1`
- **Romaji**: NAMIDA HISHIRO
- **出身**: 北海道・函馆
- **身高**: 157cm | **生日**: 2010-04-19 | **血型**: B
- **Hobby**: 深夜独自去废弃建筑拍照，专拍锈迹与蜘蛛网
- **Skill**: 能在五秒内把笑容切换成令人窒息的忧郁眼神
- **Catchphrase**: 哭是一种美，所以泪是我的名字。
- **favoriteSong**: 「Frozen Silence」（黑米 薰 solo）
- **favoriteSongs**: [「Frozen Silence」, 「半透明的夏日」, 「雨夜镜中人」]
- **admireSenior**: 黑米 薰（`m_mdv7k6ml`）、泷泽 奈奈（`m_batr9qfj`）
- **favoritePokemon**: 197（Umbreon）

#### 2. 空港树绘华 `m_9gen_2`
- **Romaji**: KIEHANA KUKO
- **出身**: 冲绳・那霸
- **身高**: 163cm | **生日**: 2010-07-24 | **血型**: O
- **Hobby**: 冲浪，并把每次乘浪的秒数换算成可以飞多远的航程
- **Skill**: 一边滑行一边背出当天航班时刻表不出差错
- **Catchphrase**: 天空再高，我也能起跳！
- **favoriteSong**: 「Summer Runway」（饭锅 利佳 center）
- **favoriteSongs**: [「Summer Runway」, 「波纹之外」, 「起飞前三分钟」]
- **admireSenior**: 饭锅 利佳（`m_jh2ureo3`）、坂口 阳菜（`m_saki`）
- **favoritePokemon**: 277（Swellow）

#### 3. 山本喜月 `m_9gen_3`
- **Romaji**: KITSUKI YAMAMOTO
- **出身**: 京都・西京区
- **身高**: 162cm | **生日**: 2010-01-08 | **血型**: A
- **Hobby**: 把读过的书按心情颜色重新排列书架，每周一换
- **Skill**: 用《源氏物语》原文即兴点评当天天气，连续三年无重复
- **Catchphrase**: 月亮是书签，我永远记得翻到哪里。
- **favoriteSong**: 「春草烟」（小林 凛凛花 center）
- **favoriteSongs**: [「春草烟」, 「深夜书架」, 「京都雨季」]
- **admireSenior**: 小林 凛凛花（`m_rjli97s6`）、今日 优（`m_ltlzffea`）
- **favoritePokemon**: 196（Espeon）

#### 4. 神崎百花 `m_9gen_4`
- **Romaji**: MOMOKA KANZAKI
- **出身**: 大阪・难波
- **身高**: 156cm | **生日**: 2010-09-03 | **血型**: O
- **Hobby**: 每天用一句话记录当天遇到的最离谱的事，已积累三年
- **Skill**: 三秒内模仿出任何人说话的口癖与节奏
- **Catchphrase**: 百花盛开，所以我不挑场合绽放！
- **favoriteSong**: 「Laugh Track」（宫岛 阿弥 center）
- **favoriteSongs**: [「Laugh Track」, 「难波阵风」, 「大声的理由」]
- **admireSenior**: 宫岛 阿弥（`m_gbojk371`）、三浦 丽莎（`m_akari`）
- **favoritePokemon**: 235（Smeargle）

#### 5. 西園寺莉央 `m_9gen_5`
- **Romaji**: RIO SAIONJI
- **出身**: 东京・港区
- **身高**: 165cm | **生日**: 2009-12-30 | **血型**: AB
- **Hobby**: 学习古典钢琴，且只在深夜一个人弹，从不录音
- **Skill**: 进任何房间十秒内，全场气氛会自动安静下来
- **Catchphrase**: 优雅不是装出来的，是你们看不见的那部分。
- **favoriteSong**: 「月夜奏鸣曲」（长谷川 玲奈 center）
- **favoriteSongs**: [「月夜奏鸣曲」, 「钢琴与寂静」, 「港区的月亮」]
- **admireSenior**: 长谷川 玲奈（`m_ff4lppj9`）、松村 珠理奈（`m_m8fltj0e`）
- **favoritePokemon**: 350（Milotic）

#### 6. 最上芽衣 `m_9gen_6`
- **Romaji**: MEI MOGAMI
- **出身**: 山形・米泽
- **身高**: 160cm | **生日**: 2010-03-07 | **血型**: A
- **Hobby**: 在草地上画地图然后把遇到的虫子当居民，给它们取名字
- **Skill**: 一分钟内叫出任何品种猫咪的正式学名，含亚种
- **Catchphrase**: 发芽的地方就是家，我随时准备扎根。
- **favoriteSong**: 「田间的风」（小泉 洋子 center）
- **favoriteSongs**: [「田间的风」, 「米泽初雪」, 「草地地图」]
- **admireSenior**: 小泉 洋子（`m_ys0s465i`）、平井 葵（`m_ayame`）
- **favoritePokemon**: 470（Leafeon）

---

## 四、不在本次范围内

- 为九期生上传公式照（`avatar` / `officialPhotos`）
- 九期生在任何单曲中的 selection（全为加入前，无需改动）
- 总选举新届数据

---

## 五、实现步骤概览

1. 修改 `src/App.jsx`：更新 `GENERATION_THEME`（5行变更）
2. 修改 `server/data/db.json`：在 `members` 数组末尾追加 6 个对象
3. 更新 `CLAUDE.md` 中的 Generation Badge Colors 表格
