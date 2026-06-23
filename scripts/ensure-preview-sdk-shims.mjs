import fs from 'node:fs'
import path from 'node:path'

const rootDir = process.cwd()
const sdkDir = path.join(rootDir, 'node_modules', '@dcl', 'sdk')
const ecsDir = path.join(rootDir, 'node_modules', '@dcl', 'ecs')

if (!fs.existsSync(sdkDir)) {
  process.exit(0)
}

const jsTarget = path.join(sdkDir, 'text-codec.js')
const dtsTarget = path.join(sdkDir, 'text-codec.d.ts')
const jsContents = "export { polyfillTextEncoder } from './ethereum-provider/text-encoder'\n"
const dtsContents = "export { polyfillTextEncoder } from './ethereum-provider/text-encoder'\n"

if (!fs.existsSync(jsTarget)) {
  fs.writeFileSync(jsTarget, jsContents, 'utf8')
}

if (!fs.existsSync(dtsTarget)) {
  fs.writeFileSync(dtsTarget, dtsContents, 'utf8')
}

if (fs.existsSync(ecsDir)) {
  const ecsIndexJs = path.join(ecsDir, 'dist', 'index.js')
  const ecsIndexDts = path.join(ecsDir, 'dist', 'index.d.ts')
  const jsShim = `
const __compositeProviderByEngine = new WeakMap();
let __defaultCompositeProvider = null;
export function setCompositeProvider(engineOrProvider, maybeProvider) {
  if (maybeProvider === undefined) {
    __defaultCompositeProvider = engineOrProvider;
    return;
  }
  __defaultCompositeProvider = maybeProvider;
  __compositeProviderByEngine.set(engineOrProvider, maybeProvider);
}
export function getCompositeProvider(engine) {
  return engine ? __compositeProviderByEngine.get(engine) ?? __defaultCompositeProvider : __defaultCompositeProvider;
}
`
  const dtsShim = `
export declare function setCompositeProvider(engineOrProvider: unknown, maybeProvider?: unknown): void;
export declare function getCompositeProvider(engine?: unknown): unknown;
`

  if (fs.existsSync(ecsIndexJs)) {
    const source = fs.readFileSync(ecsIndexJs, 'utf8')
    if (!source.includes('export function getCompositeProvider(')) {
      fs.writeFileSync(ecsIndexJs, source + jsShim, 'utf8')
    }
  }

  if (fs.existsSync(ecsIndexDts)) {
    const source = fs.readFileSync(ecsIndexDts, 'utf8')
    if (!source.includes('export declare function getCompositeProvider(')) {
      fs.writeFileSync(ecsIndexDts, source + dtsShim, 'utf8')
    }
  }
}
