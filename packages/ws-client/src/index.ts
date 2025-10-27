import { wsAutoWatcher } from "./wsAutoWatcher";
import { wsClient } from "./wsClient";

export {wsAutoWatcher, wsClient};
export default wsClient;

const wsWatcher = wsAutoWatcher();
wsWatcher.init();

window.EP.wsWatcher = wsWatcher;