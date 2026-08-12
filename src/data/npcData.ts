export type NpcDefinition = {
  id:              string
  name:            string
  model:           string
  headImage:       string
  greeting:        string   // i18n key — resolve with t() at render time
  spawnPrefix:     string   // used by the waypoint-based spawn system
  sceneEntityName: string   // name of the placed GLB entity in the scene editor
}

/** All six recurring NPCs, each with their own individual model. */
export const NPC_ROSTER: NpcDefinition[] = [
  {
    id: 'rosa', name: 'Rosa',
    model: 'assets/scene/Models/NPCRosa/NPCRosa.glb', sceneEntityName: 'NPCRosa.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/RosaHead.png',
    greeting: 'npc.rosa.greeting',
  },
  {
    id: 'gerald', name: 'Gerald',
    model: 'assets/scene/Models/NPCGerald/NPCGerald.glb', sceneEntityName: 'NPCGerald.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/GeraldHead.png',
    greeting: 'npc.gerald.greeting',
  },
  {
    id: 'marco', name: 'Marco',
    model: 'assets/scene/Models/NPCMarco/NPCMarco.glb', sceneEntityName: 'NPCMarco.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/MarcoHead.png',
    greeting: 'npc.marco.greeting',
  },
  {
    id: 'lily', name: 'Lily',
    model: 'assets/scene/Models/NPCLily/NPCLily.glb', sceneEntityName: 'NPCLily.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/LilyHead.png',
    greeting: 'npc.lily.greeting',
  },
  {
    id: 'dave', name: 'Dave',
    model: 'assets/scene/Models/NPCDave/NPCDave.glb', sceneEntityName: 'NPCDave.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/DaveHead.png',
    greeting: 'npc.dave.greeting',
  },
  {
    id: 'mayorchen', name: 'Mayor Chen',
    model: 'assets/scene/Models/NPCMayor/NPCMayor.glb', sceneEntityName: 'NPCMayor.glb', spawnPrefix: 'NPC',
    headImage: 'assets/scene/Images/MayorHead.png',
    greeting: 'npc.mayorchen.greeting',
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
