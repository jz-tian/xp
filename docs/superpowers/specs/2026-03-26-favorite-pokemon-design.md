# Favorite Pokémon Field — Design Spec

**Date:** 2026-03-26

## Summary

Add a `favoritePokemon` field (integer 1–151) to every member (active and graduated). Display it in the FAVORITES section of `MemberDetailContent` alongside 前辈 / 亲友 / 歌曲, showing the Pokémon's official sprite, Chinese name, and English name.

---

## 1. Data Layer

### Static name table

Add a `POKEMON_LIST` constant near the top of `src/App.jsx` (before component definitions). It is a 151-element array; index `i` corresponds to Pokémon number `i+1`.

```js
// index 0 = #1 Bulbasaur, index 150 = #151 Mew
const POKEMON_LIST = [
  { zh: "妙蛙种子", en: "Bulbasaur" },
  // ... 150 more entries
];
```

Helper:
```js
function getPokemon(num) {
  return POKEMON_LIST[(num ?? 1) - 1] ?? POKEMON_LIST[0];
}
```

Sprite URL derived from number:
```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/{num}.png
```

### Member field

- Field name: `favoritePokemon` (integer, 1–151)
- Stored as part of the member object in the `/data` backend blob
- One-time migration: on app load, if any member is missing `favoritePokemon`, assign a random integer `Math.floor(Math.random() * 151) + 1` and persist via the normal `saveData` path

Migration is done in a `useEffect` that runs once after initial data fetch:

```js
useEffect(() => {
  if (!data || !data.members) return;
  const needsMigration = data.members.some((m) => !m.favoritePokemon);
  if (!needsMigration) return;
  setData((prev) => ({
    ...prev,
    members: prev.members.map((m) =>
      m.favoritePokemon
        ? m
        : { ...m, favoritePokemon: Math.floor(Math.random() * 151) + 1 }
    ),
  }));
}, [/* runs once after first load */]);
```

The updated data is saved to the backend by the existing auto-save mechanism.

### Member normalization

In `normalizeMember` (the function that shapes member objects when editing), pass through `favoritePokemon` unchanged:
```js
favoritePokemon: member?.favoritePokemon || undefined,
```

---

## 2. Display Layer

### Location

Inside `MemberDetailContent`, in the `{/* FAVORITES */}` block (around line 2557 of App.jsx), after the 歌曲 row.

### New row markup

```jsx
{member.favoritePokemon ? (() => {
  const pk = getPokemon(member.favoritePokemon);
  return (
    <div className="flex items-center gap-6 py-2.5 border-b border-[#E0E0E0] last:border-b-0">
      <span className="text-[10px] tracking-[0.12em] text-[#6B6B6B] uppercase w-14 shrink-0">宝可梦</span>
      <div className="flex items-center gap-2">
        <img
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${member.favoritePokemon}.png`}
          alt={pk.en}
          className="w-8 h-8 object-contain"
          style={{ imageRendering: "pixelated" }}
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
        <span className="text-[13px] text-[#1C1C1C] tracking-[0.04em]">{pk.zh}</span>
        <span className="text-[11px] text-[#6B6B6B] tracking-[0.04em]">{pk.en}</span>
      </div>
    </div>
  );
})() : null}
```

### FAVORITES section visibility

The section's render condition (line 2558) currently checks admireSenior, friends, favoriteSongs. Add `member.favoritePokemon` as an additional condition so the section always shows when a Pokémon is assigned.

---

## 3. Admin Panel

No new controls. The field is read-only. To re-randomize, a developer clears `favoritePokemon` from the data blob and lets the migration re-run. This is out of scope for this feature.

---

## 4. Pokémon #1–151 Name Table

Full list (zh / en), in order:

1. 妙蛙种子 / Bulbasaur
2. 妙蛙草 / Ivysaur
3. 妙蛙花 / Venusaur
4. 小火龙 / Charmander
5. 火恐龙 / Charmeleon
6. 喷火龙 / Charizard
7. 杰尼龟 / Squirtle
8. 卡咪龟 / Wartortle
9. 水箭龟 / Blastoise
10. 绿毛虫 / Caterpie
11. 铁甲蛹 / Metapod
12. 巴大蝶 / Butterfree
13. 独角虫 / Weedle
14. 铠甲蛹 / Kakuna
15. 大针蜂 / Beedrill
16. 波波 / Pidgey
17. 比比鸟 / Pidgeotto
18. 大比鸟 / Pidgeot
19. 小拉达 / Rattata
20. 拉达 / Raticate
21. 烈雀 / Spearow
22. 大嘴雀 / Fearow
23. 阿柏蛇 / Ekans
24. 阿柏怪 / Arbok
25. 皮卡丘 / Pikachu
26. 雷丘 / Raichu
27. 穿山鼠 / Sandshrew
28. 穿山王 / Sandslash
29. 尼多兰 / Nidoran♀
30. 尼多娜 / Nidorina
31. 尼多后 / Nidoqueen
32. 尼多朗 / Nidoran♂
33. 尼多力诺 / Nidorino
34. 尼多王 / Nidoking
35. 皮皮 / Clefairy
36. 皮可西 / Clefable
37. 六尾 / Vulpix
38. 九尾 / Ninetales
39. 胖丁 / Jigglypuff
40. 胖可丁 / Wigglytuff
41. 超音蝠 / Zubat
42. 大嘴蝠 / Golbat
43. 走路草 / Oddish
44. 草帽蘑 / Gloom
45. 臭臭花 / Vileplume
46. 派拉斯 / Paras
47. 派拉斯特 / Parasect
48. 毛球 / Venonat
49. 摩鲁蛾 / Venomoth
50. 地鼠 / Diglett
51. 三地鼠 / Dugtrio
52. 喵喵 / Meowth
53. 猫老大 / Persian
54. 可达鸭 / Psyduck
55. 哥达鸭 / Golduck
56. 猴怪 / Mankey
57. 火爆猴 / Primeape
58. 卡蒂狗 / Growlithe
59. 风速狗 / Arcanine
60. 蚊香蝌蚪 / Poliwag
61. 蚊香君 / Poliwhirl
62. 蚊香泳士 / Poliwrath
63. 凯西 / Abra
64. 勇基拉 / Kadabra
65. 胡地 / Alakazam
66. 腕力 / Machop
67. 豪力 / Machoke
68. 怪力 / Machamp
69. 喇叭芽 / Bellsprout
70. 口呆花 / Weepinbell
71. 毒刺花 / Victreebel
72. 玛瑙水母 / Tentacool
73. 毒刺水母 / Tentacruel
74. 小拳石 / Geodude
75. 隆隆石 / Graveler
76. 隆隆岩 / Golem
77. 小火马 / Ponyta
78. 烈焰马 / Rapidash
79. 呆呆兽 / Slowpoke
80. 呆壳兽 / Slowbro
81. 小磁怪 / Magnemite
82. 三合一磁怪 / Magneton
83. 大葱鸭 / Farfetch'd
84. 嘟嘟 / Doduo
85. 嘟嘟利 / Dodrio
86. 小海狮 / Seel
87. 白海狮 / Dewgong
88. 臭泥 / Grimer
89. 臭臭泥 / Muk
90. 喇叭贝 / Shellder
91. 刺甲贝 / Cloyster
92. 鬼斯 / Gastly
93. 鬼斯通 / Haunter
94. 耿鬼 / Gengar
95. 大岩蛇 / Onix
96. 睡睡糖 / Drowzee
97. 催眠貘 / Hypno
98. 大钳蟹 / Krabby
99. 巨钳蟹 / Kingler
100. 霹雳电球 / Voltorb
101. 顿电球 / Electrode
102. 蛋蛋 / Exeggcute
103. 椰蛋树 / Exeggutor
104. 卡拉卡拉 / Cubone
105. 嘎啦嘎啦 / Marowak
106. 飞腿郎 / Hitmonlee
107. 快拳郎 / Hitmonchan
108. 大舌头 / Lickitung
109. 瓦斯弹 / Koffing
110. 双弹瓦斯 / Weezing
111. 独角犀牛 / Rhyhorn
112. 钻角犀兽 / Rhydon
113. 吉利蛋 / Chansey
114. 蔓藤怪 / Tangela
115. 袋兽 / Kangaskhan
116. 墨海马 / Horsea
117. 刺龙鱼 / Seadra
118. 角金鱼 / Goldeen
119. 宝金鱼 / Seaking
120. 海星星 / Staryu
121. 宝石海星 / Starmie
122. 魔墙人偶 / Mr. Mime
123. 飞天螳螂 / Scyther
124. 迷唇姐 / Jynx
125. 电击兽 / Electabuzz
126. 鸭嘴火兽 / Magmar
127. 凯罗斯 / Pinsir
128. 肯泰罗 / Tauros
129. 鲤鱼王 / Magikarp
130. 暴鲤龙 / Gyarados
131. 拉普拉斯 / Lapras
132. 百变怪 / Ditto
133. 伊布 / Eevee
134. 水伊布 / Vaporeon
135. 雷伊布 / Jolteon
136. 火伊布 / Flareon
137. 多边兽 / Porygon
138. 菊石兽 / Omanyte
139. 多刺菊石兽 / Omastar
140. 化石盔 / Kabuto
141. 镰刀盔 / Kabutops
142. 化石翼龙 / Aerodactyl
143. 卡比兽 / Snorlax
144. 急冻鸟 / Articuno
145. 闪电鸟 / Zapdos
146. 火焰鸟 / Moltres
147. 迷你龙 / Dratini
148. 哈克龙 / Dragonair
149. 快龙 / Dragonite
150. 超梦 / Mewtwo
151. 梦幻 / Mew

---

## 5. Out of Scope

- Pokémon type badges or pokedex number display
- Admin editing of the field
- Multiple favorite Pokémon per member
