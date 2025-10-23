export {}

declare global {
    interface Window {
        EP: {
            wsService: WebSocketAutopilot
        }
    }
}