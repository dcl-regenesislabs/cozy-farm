type SaveHandlers = {
  queue: () => void
  flush: () => void
}

let handlers: SaveHandlers = {
  queue: () => {},
  flush: () => {},
}

export function registerSaveHandlers(next: SaveHandlers): void {
  handlers = next
}

export function queueSave(): void {
  handlers.queue()
}

export function flushSave(): void {
  handlers.flush()
}
