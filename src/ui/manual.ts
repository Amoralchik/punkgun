import {
  renderManualSections,
  renderTourItems,
  type ManualLocale,
} from '../core/manual';

export function renderManual(locale: ManualLocale): string {
  return renderManualSections(locale);
}

export function renderTour(locale: ManualLocale): string {
  return renderTourItems(locale);
}
