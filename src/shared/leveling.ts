export const XP_PLANT = 5
export const XP_WATER = 3
export const XP_HARVEST_TIER1 = 10
export const XP_HARVEST_TIER2 = 20
export const XP_HARVEST_TIER3 = 35

export const XP_QUEST_REGULAR = 50
export const XP_QUEST_RETRIBUTION = 75
export const XP_QUEST_GATE = 100

// Index = current level, value = XP threshold for the next level.
// Levels 1–20 are hand-tuned. Levels 21–100 are generated at ~5% growth per level
// off the last known per-level cost (6,000 XP), giving ~300K XP/level at level 100.
function buildXpTable(): number[] {
  const table = [
         0,
       100,
       250,
       500,
       900,
     1_400,
     2_100,
     3_000,
     4_200,
     5_700,
     7_500,
     9_600,
    12_000,
    14_800,
    18_000,
    21_600,
    25_500,
    30_000,
    35_000,
    41_000,
  ]
  let lastCost = table[table.length - 1] - table[table.length - 2] // 6,000
  while (table.length < 100) {
    lastCost = Math.round(lastCost * 1.05)
    table.push(table[table.length - 1] + lastCost)
  }
  return table
}

export const XP_TABLE: number[] = buildXpTable()
