export {}

declare global {
    interface Window {
        EP: {
            wsWatcher: WebSocketAutopilot
        }
    }
}