import { LitElement, css, html, nothing, type PropertyValues } from 'lit';
import { live } from 'lit/directives/live.js';
import {
  applyHint,
  comparison,
  disclaimer,
  evaluate,
  formatMoney,
  hintFor,
  loanSummary,
  parseHintData,
  settingsFor,
  type HintData,
  type Money,
  type Settings,
} from './hints.ts';

// live: пока в поле незаконченный ввод вроде "1.", value пустое, и обычная привязка стёрла бы набранное.
const numberField = (label: string, value: string, onChange: (value: string) => void) => html`
  <label>
    <span>${label}</span>
    <input type="number" inputmode="decimal" min="0" step="any" .value=${live(value)} @input=${(e: Event) => onChange((e.target as HTMLInputElement).value)} />
  </label>
`;

class RentVsBuy extends LitElement {
  static properties = {
    mode: {},
    dataUrl: { attribute: 'data-url' },
    status: { state: true },
    data: { state: true },
    area: { state: true },
    size: { state: true },
    project: { state: true },
    money: { state: true },
    edited: { state: true },
  };

  // Только px: корневой font-size на сайте зависит от ширины экрана.
  // Внешнее правило вроде *{line-height:3} сильнее :host, поэтому .root сбрасывает наследуемое ещё раз.
  // .panel: container-type обнуляет собственную ширину содержимого, без явной width в сжимающемся родителе панель схлопнется.
  // summary::after: после косой черты пустой текст для программ чтения, чтобы знак не входил в имя; первая строка для браузеров без этой записи.
  static styles = css`
    :host,
    .root {
      all: initial;
      display: block;
      min-width: 0;
      max-width: 100%;
      font: 16px/1.5 var(--rvb-font, Lato, Arial, sans-serif);
      color: var(--ink);
      --ink: var(--rvb-ink, var(--mx-ink, #17372d));
      --leaf: var(--rvb-leaf, var(--mx-leaf, #3c9718));
      --lime: var(--rvb-lime, var(--mx-lime, #d9edaa));
      --cream: var(--rvb-cream, var(--mx-cream, #f7f5ef));
      --paper: var(--rvb-paper, var(--mx-paper, #fffefa));
      --muted: var(--rvb-muted, var(--mx-muted, #5e7168));
      --line: var(--rvb-line, var(--mx-line, #d7e0d4));
    }
    * {
      box-sizing: border-box;
    }
    :focus-visible {
      outline: 3px solid var(--leaf);
      outline-offset: 3px;
    }
    button,
    input,
    select {
      border-radius: 0;
      color: inherit;
      font: inherit;
    }
    button {
      cursor: pointer;
    }

    .open {
      position: fixed;
      left: 16px;
      bottom: 16px;
      z-index: 9999;
      min-height: 44px;
      padding: 10px 20px;
      border: 0;
      background: var(--ink);
      color: var(--paper);
      font-weight: 700;
    }
    .open:hover {
      background: #285940;
    }
    dialog {
      width: min(560px, 100vw - 16px);
      max-width: none;
      max-height: calc(100dvh - 16px);
      padding: 0;
      border: 0;
      overflow: auto;
      background: var(--paper);
      color: inherit;
    }
    dialog::backdrop {
      background: rgba(13, 45, 36, 0.55);
    }
    .close {
      position: sticky;
      top: 8px;
      float: right;
      width: 44px;
      height: 44px;
      margin: -12px -12px 0 0;
      padding: 0;
      border: 0;
      background: var(--paper);
      font-size: 28px;
      line-height: 1;
    }
    .close:hover {
      color: var(--leaf);
    }

    .panel {
      container-type: inline-size;
      width: 560px;
      max-width: 100%;
      padding: 20px;
      border: 1px solid var(--line);
      border-top: 6px solid var(--lime);
      background: var(--paper);
    }
    h2 {
      margin: 0;
      font: 400 28px/1.15 Georgia, serif;
      letter-spacing: -0.5px;
    }
    .lead {
      margin: 6px 0 16px;
      color: var(--muted);
    }
    label {
      display: block;
    }
    label span {
      display: block;
      margin-bottom: 4px;
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    input,
    select {
      display: block;
      width: 100%;
      min-height: 44px;
      padding: 8px 12px;
      border: 1px solid var(--muted);
      background-color: var(--paper);
    }
    select:disabled {
      background-color: var(--cream);
      color: var(--muted);
    }
    .place,
    .grid,
    .two {
      display: grid;
      gap: 12px;
      align-items: end;
    }
    .place {
      grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
    }
    .place .project {
      grid-column: 1 / -1;
    }
    .grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    .two {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .note {
      margin: 8px 0 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    details {
      margin-top: 12px;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
    }
    summary {
      position: relative;
      display: block;
      min-height: 44px;
      padding: 10px 28px 10px 0;
      font-weight: 700;
      cursor: pointer;
    }
    summary small {
      display: block;
      color: var(--muted);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.3;
    }
    summary::-webkit-details-marker {
      display: none;
    }
    summary::after {
      content: '+';
      content: '+' / '';
      position: absolute;
      top: 10px;
      right: 6px;
      color: var(--leaf);
      font-size: 20px;
      line-height: 24px;
    }
    details[open] summary::after {
      content: '−';
      content: '−' / '';
    }
    details .grid,
    details .two {
      padding-bottom: 12px;
    }

    .error {
      margin: 12px 0 0;
      color: #b54838;
      font-weight: 700;
    }
    dl {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
      margin: 12px 0 0;
    }
    dl > div {
      padding: 12px;
      border: 1px solid var(--line);
      background: var(--cream);
    }
    .compare {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin: 12px 0 0;
      padding: 12px 14px;
      border: 2px solid var(--line);
      border-radius: 8px;
      background: var(--cream);
      font-size: 18px;
      font-weight: 700;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }
    .compare.lower {
      border-color: var(--leaf);
      background: #e1f0c1;
    }
    .compare.higher {
      border-color: #b54838;
      background: #fbe0dc;
    }
    /* Значок только для глаз: «lower» и «higher» уже есть в тексте, поэтому alt-текст пустой. */
    .compare.lower::before,
    .compare.higher::before {
      flex: none;
      font-size: 1.2em;
      line-height: 1;
    }
    .compare.lower::before {
      content: '✓';
      content: '✓' / '';
      color: var(--leaf);
    }
    .compare.higher::before {
      content: '✗';
      content: '✗' / '';
      color: #b54838;
    }
    dt {
      font-size: 14px;
      font-weight: 700;
      line-height: 1.3;
    }
    dd {
      margin: 0;
    }
    .value {
      margin-top: 4px;
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
      overflow-wrap: anywhere;
    }
    .fine {
      margin: 12px 0 0;
      color: var(--muted);
      font-size: 13px;
      line-height: 1.4;
    }
    @container (max-width: 460px) {
      .place,
      .grid,
      .two,
      dl {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `;

  declare mode: string | undefined;
  declare dataUrl: string | undefined;
  declare status: 'manual' | 'loading' | 'ready' | 'failed';
  declare data: HintData | null;
  declare area: string;
  declare size: string;
  declare project: string;
  declare money: Money;
  declare edited: Partial<Settings>;

  // Набор площади по цифрам или проекта по буквам — одно изменение: иначе промежуточная "15" затрёт ручной ввод, а итоговая "150" без пары его не вернёт.
  private typingStart: Money | null = null;
  private pressedBackdrop = false;

  constructor() {
    super();
    this.status = 'manual';
    this.data = null;
    this.area = '';
    this.size = '';
    this.project = '';
    this.money = { price: '', rent: '', hintedPrice: false, hintedRent: false };
    this.edited = {};
  }

  protected willUpdate(changed: PropertyValues) {
    if (!changed.has('dataUrl') || !this.dataUrl) return;
    this.status = 'loading';
    fetch(this.dataUrl, { credentials: 'omit' })
      .then((response) => (response.ok ? response.json() : null))
      .then(parseHintData)
      .catch(() => null)
      .then((data) => {
        this.data = data;
        this.status = data ? 'ready' : 'failed';
      });
  }

  private setPlace(area: string, size: string, project: string, money = this.money) {
    this.area = area;
    this.size = size;
    this.project = project;
    this.money = applyHint(money, this.data && hintFor(this.data, area, Number(size), project));
  }

  private openPanel() {
    this.renderRoot.querySelector('dialog')!.showModal();
  }

  private closePanel() {
    this.renderRoot.querySelector('dialog')!.close();
  }

  // У dialog нет padding, поэтому сам dialog получает нажатие только с подложки.
  // click тут недостаточно: он придёт на dialog и когда нажали внутри, а отпустили на подложке.
  private closeOnBackdrop(e: MouseEvent) {
    if (this.pressedBackdrop && e.target === e.currentTarget) this.closePanel();
  }

  private screen() {
    const { status, data, area, size, project, money, edited } = this;
    const settings = settingsFor(edited, data?.config);
    const { error, rent, result } = evaluate({ ...money, ...settings }, data?.config.fees);
    const hint = data && hintFor(data, area, Number(size), project);
    const projects = data?.areas.find((a) => a.name === area)?.projects ?? [];
    const compared = comparison(rent, result?.monthlyPayment);

    // Пока площадь набирается, сообщение не показываем: иначе оно мелькнёт на «7» при наборе «70».
    let note = '';
    if (hint && (money.hintedPrice || money.hintedRent)) note = hint.caption;
    else if (data && area && size !== '' && !hint && !this.typingStart) note = 'No estimate for this size. Enter a size from 15 to 999 m² or your own numbers below.';
    else if (status === 'failed') note = 'Area estimates are unavailable. Enter your own numbers.';

    const editSetting = (key: keyof Settings) => (value: string) => (this.edited = { ...edited, [key]: value });

    return html`
      <h2 id="title">Rent or buy in Dubai</h2>
      <p class="lead">Choose an area and size to compare rent with a mortgage.</p>
      ${status === 'loading' || status === 'ready'
        ? html`
            <div
              class="place"
              @focusout=${() => {
                this.typingStart = null;
                this.requestUpdate();
              }}
            >
              <label>
                <span>Area</span>
                <select ?disabled=${status === 'loading'} @change=${(e: Event) => this.setPlace((e.target as HTMLSelectElement).value, size, '')}>
                  <option value="">${status === 'loading' ? 'Loading areas…' : 'Select an area'}</option>
                  ${data?.areas.map((a) => html`<option value=${a.name}>${a.name}</option>`)}
                </select>
              </label>
              ${numberField('Size (m²)', size, (value) => this.setPlace(area, value, project, (this.typingStart ??= money)))}
              ${projects.length
                ? html`
                    <label class="project">
                      <span>Building or project (optional)</span>
                      <input
                        list="projects"
                        autocomplete="off"
                        placeholder="Start typing a name"
                        .value=${live(project)}
                        @input=${(e: Event) => this.setPlace(area, size, (e.target as HTMLInputElement).value, (this.typingStart ??= money))}
                      />
                      <datalist id="projects">${projects.map((p) => html`<option value=${p.name}></option>`)}</datalist>
                    </label>
                  `
                : nothing}
            </div>
          `
        : nothing}
      <div aria-live="polite">${note ? html`<p class="note">${note}</p>` : nothing}</div>
      <div aria-live="polite">
        ${error ? html`<p class="error">${error}</p>` : nothing}
        <dl>
          <div>
            <dt>Rent per month</dt>
            <dd class="value">${formatMoney(rent)}</dd>
          </div>
          <div>
            <dt>Mortgage payment per month</dt>
            <dd class="value">${formatMoney(result?.monthlyPayment)}</dd>
            ${result?.feesComplete ? html`<dd class="note">Includes property and life insurance.</dd>` : nothing}
          </div>
        </dl>
        ${compared ? html`<p class="compare ${compared.sign < 0 ? 'lower' : compared.sign > 0 ? 'higher' : ''}">${compared.text}</p>` : nothing}
        <dl>
          <div>
            <dt>Property price</dt>
            <dd class="value">${formatMoney(result ? Number(money.price) : null)}</dd>
          </div>
          <div>
            <dt>Cash needed upfront</dt>
            <dd class="value">${formatMoney(result?.cashAtStart)}</dd>
            <dd class="note">Includes the down payment and purchase fees.</dd>
            ${result?.feesComplete === false ? html`<dd class="note">Some fees are not included yet, so the real amount may be higher.</dd>` : nothing}
          </div>
        </dl>
      </div>
      <details ?open=${status === 'manual' || status === 'failed'}>
        <summary>
          Change price, rent or loan
          <small>${loanSummary(settings)}</small>
        </summary>
        <div class="two">
          ${numberField('Property price (AED)', money.price, (price) => (this.money = { ...money, price, hintedPrice: false }))}
          ${numberField('Rent per month (AED)', money.rent, (rent) => (this.money = { ...money, rent, hintedRent: false }))}
        </div>
        <div class="grid">
          ${numberField('Down payment (%)', settings.downPaymentPct, editSetting('downPaymentPct'))}
          ${numberField('Interest rate (%)', settings.ratePct, editSetting('ratePct'))}
          ${numberField('Term (years)', settings.termYears, editSetting('termYears'))}
        </div>
      </details>
      <p class="fine">${disclaimer(data)}</p>
    `;
  }

  render() {
    if (this.mode !== 'floating') return html`<div class="root"><div class="panel">${this.screen()}</div></div>`;
    return html`
      <div class="root">
        <button class="open" aria-haspopup="dialog" @click=${this.openPanel}>Rent or buy?</button>
        <dialog aria-labelledby="title" @pointerdown=${(e: PointerEvent) => (this.pressedBackdrop = e.target === e.currentTarget)} @click=${this.closeOnBackdrop}>
          <div class="panel">
            <button class="close" aria-label="Close" @click=${this.closePanel}>×</button>
            ${this.screen()}
          </div>
        </dialog>
      </div>
    `;
  }
}

// Скрипт могут подключить дважды: повторный define бросил бы исключение.
if (!customElements.get('rent-vs-buy')) customElements.define('rent-vs-buy', RentVsBuy);
