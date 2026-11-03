import { truncateText } from '../shared/format';
import {
  SCREENSHOT_NOTE_FIELD,
  SCREENSHOT_NOTE_INPUT,
  SCREENSHOT_NOTE_SENSITIVE,
  buildInstruction,
} from '../shared/instructions';
import type { CapturedAction, ElementKind } from '../shared/types';

const INTERACTIVE_SELECTOR = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="combobox"]',
  '[onclick]',
].join(',');

const SENSITIVE_AUTOCOMPLETE =
  /current-password|new-password|one-time-code|cc-number|cc-csc|cc-exp|cc-name|cc-type|cc-given-name|cc-family-name|transaction-currency|transaction-amount/i;

const SENSITIVE_HINT =
  /password|passwd|pwd|passcode|otp|one[-_. ]?time|token|secret|api[-_. ]?key|cvv|cvc|card[-_. ]?(?:number|no|num)|credit[-_. ]?card|security[-_. ]?code|iban|\bcc\b|cardnumber/i;

function visibleText(element: Element): string {
  if (element instanceof HTMLElement) {
    return element.innerText;
  }
  return element.textContent ?? '';
}

function cleanLabel(value: string): string {
  return truncateText(
    value
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}

function labelTextFromIds(element: Element): string {
  const ids = (element.getAttribute('aria-labelledby') ?? '').split(/\s+/).filter(Boolean);
  if (ids.length === 0) return '';
  return ids
    .map((id) => document.getElementById(id)?.textContent ?? '')
    .join(' ')
    .trim();
}

function getAssociatedLabelText(element: Element): string {
  if ('labels' in element) {
    const labels = (element as HTMLInputElement).labels;
    if (labels && labels.length > 0) {
      return Array.from(labels)
        .map((label) => visibleText(label))
        .join(' ')
        .trim();
    }
  }
  const closestLabel = element.closest('label');
  if (closestLabel) return visibleText(closestLabel);
  return '';
}

export function getElementLabel(element: Element | null): string {
  if (!element) return '';

  const candidates = [
    labelTextFromIds(element),
    element.getAttribute('aria-label') ?? '',
    getAssociatedLabelText(element),
  ];

  if (
    element instanceof HTMLInputElement &&
    ['button', 'submit', 'reset'].includes(element.type)
  ) {
    candidates.push(element.getAttribute('value') ?? '');
  }

  const role = element.getAttribute('role');
  if (
    element.matches('button, a, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"]') ||
    role === 'checkbox' ||
    role === 'radio' ||
    role === 'switch'
  ) {
    candidates.push(visibleText(element));
    const imageAlt = element.querySelector('img[alt]')?.getAttribute('alt') ?? '';
    candidates.push(imageAlt);
  }

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    candidates.push(element.getAttribute('placeholder') ?? '');
  }

  candidates.push(element.getAttribute('title') ?? '');

  const name = element.getAttribute('name') ?? element.getAttribute('id') ?? '';
  if (name && name.length <= 48) {
    candidates.push(name.replace(/[-_]+/g, ' '));
  }

  for (const candidate of candidates) {
    const cleaned = cleanLabel(candidate);
    if (cleaned) return cleaned;
  }
  return '';
}

function getElementKind(element: Element): ElementKind {
  if (element instanceof HTMLInputElement) {
    if (['button', 'submit', 'reset', 'image'].includes(element.type)) return 'button';
    if (element.type === 'checkbox') return 'checkbox';
    if (element.type === 'radio') return 'radio';
    if (element.type === 'search' || element.type === 'email' || element.type === 'tel') {
      return 'input';
    }
    return 'input';
  }
  if (element instanceof HTMLSelectElement) return 'select';
  if (element instanceof HTMLTextAreaElement) return 'textarea';

  const role = element.getAttribute('role');
  if (role === 'button') return 'button';
  if (role === 'link') return 'link';
  if (role === 'tab') return 'tab';
  if (role === 'menuitem') return 'menuitem';
  if (role === 'checkbox' || role === 'switch') return 'checkbox';
  if (role === 'radio') return 'radio';
  if (element.tagName.toLowerCase() === 'a') return 'link';
  if (element.tagName.toLowerCase() === 'button') return 'button';
  return 'control';
}

export function findInteractiveElement(target: Element | null): Element | null {
  if (!target) return null;
  const label = target.closest('label');
  if (label instanceof HTMLLabelElement && label.control) {
    return label.control;
  }
  return target.closest(INTERACTIVE_SELECTOR);
}

export function isElementVisible(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  const style = window.getComputedStyle(element);
  if (style.visibility === 'hidden' || style.display === 'none') return false;
  return Number(style.opacity) > 0;
}

export function isDisabledElement(element: Element): boolean {
  if (element.getAttribute('aria-disabled') === 'true') return true;
  return element.matches(':disabled');
}

export function isSensitiveField(element: Element): boolean {
  if (element instanceof HTMLInputElement && element.type === 'password') return true;

  const autocomplete = (element.getAttribute('autocomplete') ?? '').toLowerCase();
  if (SENSITIVE_AUTOCOMPLETE.test(autocomplete)) return true;

  const hints = [
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label'),
    element.getAttribute('data-testid'),
    element.getAttribute('autocomplete'),
  ]
    .filter(Boolean)
    .join(' ')
    .replace(/[_-]+/g, ' ');

  return SENSITIVE_HINT.test(hints);
}

export function actionFromClick(element: Element): CapturedAction | null {
  if (!isElementVisible(element) || isDisabledElement(element)) return null;

  if (element instanceof HTMLInputElement) {
    if (['checkbox', 'radio', 'file', 'range', 'color'].includes(element.type)) return null;
    if (!['button', 'submit', 'reset', 'image'].includes(element.type)) return null;
  }

  if (element instanceof HTMLSelectElement || element instanceof HTMLTextAreaElement) {
    return null;
  }

  if (
    element instanceof HTMLElement &&
    element.isContentEditable &&
    !element.matches('[role="button"], [role="link"]')
  ) {
    return null;
  }

  const kind = getElementKind(element);
  const label = getElementLabel(element);
  const role = element.getAttribute('role');
  const isRoleToggle = role === 'checkbox' || role === 'radio' || role === 'switch';

  if (isRoleToggle) {
    const ariaChecked = element.getAttribute('aria-checked');
    const checked = ariaChecked === 'true' ? false : ariaChecked === 'false' ? true : undefined;
    return {
      actionType: 'toggle',
      elementKind: role === 'radio' ? 'radio' : 'checkbox',
      elementLabel: label,
      instruction: buildInstruction('toggle', label, {
        kind: role === 'radio' ? 'radio' : 'checkbox',
        checked,
      }),
      sensitive: false,
      allowScreenshot: true,
    };
  }

  return {
    actionType: 'click',
    elementKind: kind,
    elementLabel: label,
    instruction: buildInstruction('click', label, { kind }),
    sensitive: false,
    allowScreenshot: true,
  };
}

export function actionFromChange(element: Element): CapturedAction | null {
  if (isDisabledElement(element)) return null;

  if (element instanceof HTMLInputElement) {
    const type = (element.type || 'text').toLowerCase();
    if (['file', 'hidden', 'button', 'submit', 'reset', 'image'].includes(type)) return null;

    if (type === 'checkbox' || type === 'radio') {
      const kind = type === 'radio' ? 'radio' : 'checkbox';
      const label = getElementLabel(element);
      return {
        actionType: 'toggle',
        elementKind: kind,
        elementLabel: label,
        instruction: buildInstruction('toggle', label, {
          kind,
          checked: element.checked,
        }),
        sensitive: false,
        allowScreenshot: true,
      };
    }

    if (type === 'range' || type === 'color') return null;

    const sensitive = isSensitiveField(element);
    const label = getElementLabel(element);
    return {
      actionType: 'input',
      elementKind: 'input',
      elementLabel: label,
      instruction: buildInstruction('input', label),
      sensitive,
      allowScreenshot: false,
      screenshotNote: sensitive ? SCREENSHOT_NOTE_SENSITIVE : SCREENSHOT_NOTE_INPUT,
    };
  }

  if (element instanceof HTMLTextAreaElement) {
    const sensitive = isSensitiveField(element);
    const label = getElementLabel(element);
    return {
      actionType: 'input',
      elementKind: 'textarea',
      elementLabel: label,
      instruction: buildInstruction('input', label),
      sensitive,
      allowScreenshot: false,
      screenshotNote: sensitive ? SCREENSHOT_NOTE_SENSITIVE : SCREENSHOT_NOTE_INPUT,
    };
  }

  if (element instanceof HTMLSelectElement) {
    const label = getElementLabel(element);
    return {
      actionType: 'select',
      elementKind: 'select',
      elementLabel: label,
      instruction: buildInstruction('select', label),
      sensitive: isSensitiveField(element),
      allowScreenshot: false,
      screenshotNote: SCREENSHOT_NOTE_FIELD,
    };
  }

  return null;
}
