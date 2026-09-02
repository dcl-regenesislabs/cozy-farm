type SaveHandlers = { queue: () => void; flush: () => void }

let handlers: SaveHandlers = { queue: () => {}, flush: () => {} }

export function registerSaveHandlers(next: SaveHandlers): void {
  handlers = next
}

/** Debounced save — coalesces rapid actions into one save after 1s of quiet. */
export function queueSave(): void {
  handlers.queue()
}

/** Immediate save — sends right now if ready, retries until server is up. Use for critical moments (reset, leave scene). */
export function flushSave(): void {
  handlers.flush()
}
