export type NpcDefinition = {
  id:              string
  name:            string
  model:           string
  headImage:       string
  greeting:        string
  spawnPrefix:     string   // used by the waypoint-based spawn system
  sceneEntityName: string   // name of the placed GLB entity in the scene editor
}

/** All six recurring NPCs, each with their own individual model. */
export const NPC_ROSTER: NpcDefinition[] = [
  {
    id: 'rosa', name: 'Rosa',
    model: 'assets/scene/Models/NPCRosa/NPCRosa.glb', sceneEntityName: 'NPCRosa.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/RosaHead.png',
    greeting: "Oh hello, dear! Lovely little farm you have here.\nI was just admiring your crops. Do you need any help?",
  },
  {
    id: 'gerald', name: 'Gerald',
    model: 'assets/scene/Models/NPCGerald/NPCGerald.glb', sceneEntityName: 'NPCGerald.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/GeraldHead.png',
    greeting: "Oh, it's you. I suppose your dog was in my garden again.\nYou might want to keep a closer eye on things around here.",
  },
  {
    id: 'marco', name: 'Marco',
    model: 'assets/scene/Models/NPCMarco/NPCMarco.glb', sceneEntityName: 'NPCMarco.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/MarcoHead.png',
    greeting: "Ha! My farm is twice the size of yours.\nBut I'll admit... your crops don't look half bad.",
  },
  {
    id: 'lily', name: 'Lily',
    model: 'assets/scene/Models/NPCLily/NPCLily.glb', sceneEntityName: 'NPCLily.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/LilyHead.png',
    greeting: "Perfect timing! I need fresh produce for tonight's special.\nCould you help me out? I pay well.",
  },
  {
    id: 'dave', name: 'Dave',
    model: 'assets/scene/Models/NPCDave/NPCDave.glb', sceneEntityName: 'NPCDave.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/DaveHead.png',
    greeting: "Oh thank goodness you're here. I accidentally flooded my cellar again.\nAnyway, lovely day, right?",
  },
  {
    id: 'mayorchen', name: 'Mayor Chen',
    model: 'assets/scene/Models/NPCMayor/NPCMayor.glb', sceneEntityName: 'NPCMayor.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/MayorHead.png',
    greeting: "Ah, good day. The town council has been keeping an eye on your progress.\nWe have a proposal that may interest you.",
  },
]

/** Mayor Chen — spawned immediately as tutorial guide, separate from the regular NPC rotation. */
export const MAYOR_DEF = NPC_ROSTER.find((n) => n.id === 'mayorchen')!

/** The five regular visiting NPCs — spawned on a timer after the tutorial is complete. */
export const REGULAR_NPC_ROSTER = NPC_ROSTER.filter((n) => n.id !== 'mayorchen')

/** Minimum player level required for each regular NPC to appear. */
export const NPC_SCHEDULE: Record<string, { minLevel: number }> = {
  rosa:       { minLevel: 1 },
  gerald:     { minLevel: 2 },
  marco:      { minLevel: 3 },
  lily:       { minLevel: 4 },
  dave:       { minLevel: 5 },
  mayorchen:  { minLevel: 5 },
}
