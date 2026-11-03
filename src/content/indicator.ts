const HOST_ID = 'dalil-recording-indicator';
const STYLE_ID = 'dalil-recording-indicator-style';

const STYLES = `
  #${HOST_ID} {
    all: initial;
    position: fixed;
    bottom: 20px;
    left: 20px;
    z-index: 2147483647;
    direction: rtl;
    font-family: 'IBM Plex Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
  }
  #${HOST_ID} * { box-sizing: border-box; }
  .dalil-pill {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 14px;
    border: 1px solid rgba(233, 231, 241, 0.9);
    background: rgba(255, 255, 255, 0.97);
    box-shadow: 0 16px 40px -18px rgba(25, 24, 39, 0.45);
    backdrop-filter: blur(8px);
    color: #191827;
    font-size: 13px;
    line-height: 1;
  }
  .dalil-dot {
    width: 9px;
    height: 9px;
    border-radius: 999px;
    background: #B4233A;
    box-shadow: 0 0 0 4px rgba(180, 35, 58, 0.14);
    animation: dalil-blink 1.6s ease-in-out infinite;
  }
  .dalil-pill[data-paused='true'] .dalil-dot {
    background: #9A5B00;
    box-shadow: 0 0 0 4px rgba(154, 91, 0, 0.14);
    animation: none;
  }
  .dalil-label { font-weight: 600; white-space: nowrap; }
  .dalil-count {
    color: #747387;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .dalil-actions { display: inline-flex; align-items: center; gap: 4px; }
  .dalil-btn {
    all: unset;
    cursor: pointer;
    border-radius: 9px;
    padding: 5px 9px;
    font-size: 12px;
    font-weight: 600;
    color: #4E229F;
    background: #F2EDFE;
    transition: background-color 120ms ease;
  }
  .dalil-btn:hover { background: #E7DDFD; }
  .dalil-btn[data-kind='stop'] { color: #B4233A; background: #FCEFF1; }
  .dalil-btn[data-kind='stop']:hover { background: #F8E0E5; }
  .dalil-hint {
    position: absolute;
    bottom: calc(100% + 8px);
    left: 0;
    width: 268px;
    padding: 9px 11px;
    border-radius: 12px;
    border: 1px solid #E9E7F1;
    background: #FFFFFF;
    box-shadow: 0 16px 40px -20px rgba(25, 24, 39, 0.4);
    color: #747387;
    font-size: 12px;
    line-height: 1.7;
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition: opacity 140ms ease, transform 140ms ease;
  }
  #${HOST_ID}:hover .dalil-hint { opacity: 1; transform: translateY(0); }
  @keyframes dalil-blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.35; }
  }
  @media (prefers-reduced-motion: reduce) {
    .dalil-dot { animation: none; }
  }
`;

export interface IndicatorHandlers {
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export interface IndicatorState {
  status: 'recording' | 'paused';
  stepCount: number;
}

let host: HTMLDivElement | null = null;
let pill: HTMLDivElement | null = null;
let dot: HTMLSpanElement | null = null;
let label: HTMLSpanElement | null = null;
let count: HTMLSpanElement | null = null;
let toggleButton: HTMLButtonElement | null = null;

function ensureStyle(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = STYLES;
  (document.head ?? document.documentElement).appendChild(style);
}

function makeButton(kind: 'toggle' | 'stop', text: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dalil-btn';
  button.dataset.kind = kind;
  button.textContent = text;
  return button;
}

function render(state: IndicatorState): void {
  if (!pill || !label || !count || !dot || !toggleButton) return;
  const paused = state.status === 'paused';
  pill.dataset.paused = paused ? 'true' : 'false';
  dot.setAttribute('aria-hidden', 'true');
  label.textContent = paused ? 'التسجيل متوقف مؤقتًا' : 'جارٍ التسجيل';
  count.textContent = state.stepCount === 1 ? 'خطوة واحدة' : `${state.stepCount} خطوة`;
  toggleButton.textContent = paused ? 'متابعة' : 'إيقاف مؤقت';
  toggleButton.dataset.kind = 'toggle';
}

export function showIndicator(state: IndicatorState, handlers: IndicatorHandlers): void {
  ensureStyle();

  if (host) {
    render(state);
    return;
  }

  host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('dir', 'rtl');

  pill = document.createElement('div');
  pill.className = 'dalil-pill';
  pill.setAttribute('role', 'status');
  pill.setAttribute('aria-live', 'polite');

  dot = document.createElement('span');
  dot.className = 'dalil-dot';

  label = document.createElement('span');
  label.className = 'dalil-label';

  count = document.createElement('span');
  count.className = 'dalil-count';

  toggleButton = makeButton('toggle', 'إيقاف مؤقت');
  toggleButton.addEventListener('click', () => {
    if (pill?.dataset.paused === 'true') {
      handlers.onResume();
    } else {
      handlers.onPause();
    }
  });

  const stopButton = makeButton('stop', 'إنهاء');
  stopButton.addEventListener('click', () => handlers.onStop());

  const actions = document.createElement('div');
  actions.className = 'dalil-actions';
  actions.append(toggleButton, stopButton);

  const hint = document.createElement('div');
  hint.className = 'dalil-hint';
  hint.textContent =
    'يستمع دليل للتفاعل داخل هذه الصفحة فقط، ولا يرسل أي بيانات خارج جهازك.';

  pill.append(dot, label, count, actions);
  host.append(hint, pill);
  document.documentElement.appendChild(host);

  render(state);
}

export function updateIndicator(state: IndicatorState): void {
  render(state);
}

export function hideIndicator(): void {
  host?.remove();
  host = null;
  pill = null;
  dot = null;
  label = null;
  count = null;
  toggleButton = null;
}
