import { t } from '../core/i18n';

export type RunBoon = 'armor' | 'pay' | 'quiet' | 'components';

export interface BoonDef {
  id: RunBoon;
  label: string;
  desc: string;
  color: string;
}

export const BOONS: Record<RunBoon, BoonDef> = {
  armor: {
    id: 'armor',
    label: t('boon.armor.label'),
    desc: t('boon.armor.desc'),
    color: '#ff7a4c',
  },
  pay: {
    id: 'pay',
    label: t('boon.pay.label'),
    desc: t('boon.pay.desc'),
    color: '#ffc46b',
  },
  quiet: {
    id: 'quiet',
    label: t('boon.quiet.label'),
    desc: t('boon.quiet.desc'),
    color: '#5ef1ff',
  },
  components: {
    id: 'components',
    label: t('boon.components.label'),
    desc: t('boon.components.desc'),
    color: '#b38cff',
  },
};
