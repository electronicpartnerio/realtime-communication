import { TOAST_MSG_PREFIX } from '../../constant';
import { t } from '@electronicpartnerio/ep-lit-translate';

export const translateSafe = async (msg?: string): Promise<string> => {
    if (!msg) return 'no message';

    return msg.startsWith(TOAST_MSG_PREFIX) ? await t.g(msg) : msg;
};