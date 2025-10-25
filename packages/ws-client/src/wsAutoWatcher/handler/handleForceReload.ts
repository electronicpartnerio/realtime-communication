import {translateSafe} from "../util/translateSafe";

export const handleForceReload = async (confirmMsg?: string): Promise<void> => {
    const text = await translateSafe(confirmMsg);
    const ok = confirm(text);
    if (ok) location.reload();
};