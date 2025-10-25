import {translateSafe} from "../util/translateSafe";

export const handleAlert = async (msg?: string): Promise<void> => {
    const text = await translateSafe(msg);
    if (text) alert(text);
};