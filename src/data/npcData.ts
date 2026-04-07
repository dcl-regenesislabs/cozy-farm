const NPC01_MODEL = 'assets/scene/Models/NPC01/NPC01.glb'

export type NpcDefinition = {
  id:          string
  name:        string
  model:       string
  headImage:   string
  greeting:    string
  spawnPrefix: string  // prefix for spawn point entity names (e.g. 'NPC01' → NPCSpawn01, NPCSpawn01_2 … _5)
}

/** All six recurring NPCs. All share NPC01.glb until individual models arrive. */
export const NPC_ROSTER: NpcDefinition[] = [
  {
    id: 'rosa', name: 'Rosa', model: NPC01_MODEL, spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/RosaHead.png',
    greeting: "Oh hello, dear! Lovely little farm you have here.\nI was just admiring your crops. Do you need any help?",
  },
  {
    id: 'gerald', name: 'Gerald', model: NPC01_MODEL, spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/GeraldHead.png',
    greeting: "Oh, it's you. I suppose your dog was in my garden again.\nYou might want to keep a closer eye on things around here.",
  },
  {
    id: 'marco', name: 'Marco', model: NPC01_MODEL, spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/MarcoHead.png',
    greeting: "Ha! My farm is twice the size of yours.\nBut I'll admit... your crops don't look half bad.",
  },
  {
    id: 'lily', name: 'Lily', model: NPC01_MODEL, spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/LilyHead.png',
    greeting: "Perfect timing! I need fresh produce for tonight's special.\nCould you help me out? I pay well.",
  },
  {
    id: 'dave', name: 'Dave', model: NPC01_MODEL, spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/DaveHead.png',
    greeting: "Oh thank goodness you're here. I accidentally flooded my cellar again.\nAnyway, lovely day, right?",
  },
  {
    id: 'mayorchen', name: 'Mayor Chen', model: NPC01_MODEL, spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/MayorHead.png',
    greeting: "Ah, good day. The town council has been keeping an eye on your progress.\nWe have a proposal that may interest you.",
  },
]
