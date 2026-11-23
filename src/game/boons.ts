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
    get label() {
      return t('boon.armor.label');
    },
    get desc() {
      return t('boon.armor.desc');
    },
    color: '#ff7a4c',
  },
  pay: {
    id: 'pay',
    get label() {
      return t('boon.pay.label');
    },
    get desc() {
      return t('boon.pay.desc');
    },
    color: '#ffc46b',
  },
  quiet: {
    id: 'quiet',
    get label() {
      return t('boon.quiet.label');
    },
    get desc() {
      return t('boon.quiet.desc');
    },
    color: '#5ef1ff',
  },
  components: {
    id: 'components',
    get label() {
      return t('boon.components.label');
    },
    get desc() {
      return t('boon.components.desc');
    },
    color: '#b38cff',
  },
};
