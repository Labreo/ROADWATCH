import { globalTemplates } from '@/data/globalTemplates';

let activeRegionCode: string = 'IN';

export function setActiveRegion(code: string) {
  if (globalTemplates[code]) {
    activeRegionCode = code;
  }
}

export function getActiveRegion(): string {
  return activeRegionCode;
}

export function getActiveTemplate() {
  return globalTemplates[activeRegionCode] || globalTemplates.IN;
}

export function formatCurrency(value: number, short?: boolean): string {
  const template = getActiveTemplate();
  return template.formatCurrency(value, short);
}

export function formatManagerName(name: string): string {
  const template = getActiveTemplate();
  return template.formatManagerName(name);
}

export function createCurrencyFormatter(locale?: string, currency?: string) {
  const template = getActiveTemplate();
  const activeLocale = locale || template.locale;
  const activeCurrency = currency || template.currency;
  return {
    format: (value: number, short?: boolean) => {
      if (short) {
        const sym = template.currencySymbol;
        if (activeCurrency === 'INR') {
          if (value >= 10000000) return `${sym}${(value / 10000000).toFixed(2)} Cr`;
          if (value >= 100000) return `${sym}${(value / 100000).toFixed(2)} L`;
        } else {
          if (value >= 1000000000) return `${sym}${(value / 1000000000).toFixed(2)} B`;
          if (value >= 1000000) return `${sym}${(value / 1000000).toFixed(2)} M`;
        }
      }
      return new Intl.NumberFormat(activeLocale, {
        style: 'currency',
        currency: activeCurrency,
        maximumFractionDigits: 0,
      }).format(value);
    },
  };
}
