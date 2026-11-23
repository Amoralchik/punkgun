import { renderManualSections, type ManualLocale } from '../core/manual';

export function renderManual(locale: ManualLocale): string {
  return renderManualSections(locale);
}
