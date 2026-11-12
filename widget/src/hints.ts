import { calculate, type Fees } from './calc.ts';

type SizeBand = { id: string; from: number; to: number };
type Band = { salePerSqm: number; saleSizeSqm: number; sales: number; rentPerSqmYear: number; rentSizeSqm: number; rents: number };
// Точка проекта по диапазону площади: медианы площади и суммы за м² (у аренды за год) и число сделок.
type Point = [sizeSqm: number, perSqm: number, deals: number];
type Project = { name: string; sales: Point[]; rents: Point[] };
type Area = { name: string; rentArea: string; bands: Record<string, Band>; projects?: Project[] };
type Config = { ratePct: number; downPaymentPct: number; termYears: number; fees: Partial<Fees> };
export type HintData = { asOf: string; periodFrom: string; periodTo: string; config: Config; sizeBands: SizeBand[]; areas: Area[] };
type Hint = { price: number; monthlyRent: number; caption: string };

// Значения полей как в input: строка, пустая строка значит «не заполнено».
export type Settings = { downPaymentPct: string; ratePct: string; termYears: string };
export type Fields = Settings & { price: string; rent: string };
export type Money = { price: string; rent: string; hintedPrice: boolean; hintedRent: boolean };

const DEFAULTS = { downPaymentPct: 20, ratePct: 3.99, termYears: 25 }; // 3,99% — минимальная базовая ставка банков на ноябрь 2026
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const nonNegative = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const positive = (v: unknown): v is number => nonNegative(v) && v > 0;
const validDown = (v: unknown) => nonNegative(v) && v <= 99;
const validTerm = (v: unknown) => Number.isInteger(v) && positive(v) && v <= 25;
const isCount = (v: unknown) => Number.isInteger(v) && positive(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.length <= 100 && v.trim() !== '';
const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const allDifferent = (values: string[]) => new Set(values).size === values.length;

// Настоящая дата: 31 февраля Date.UTC перенесёт на март, и строка не совпадёт.
const isDate = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [year, month, day] = v.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10) === v;
};
const isMonth = (v: unknown): v is string => typeof v === 'string' && isDate(`${v}-01`);

const isSizeBand = (v: unknown) => isObject(v) && isText(v.id) && positive(v.from) && positive(v.to) && v.from < v.to;
const isBand = (v: unknown) =>
  isObject(v) && positive(v.salePerSqm) && positive(v.saleSizeSqm) && isCount(v.sales) && positive(v.rentPerSqmYear) && positive(v.rentSizeSqm) && isCount(v.rents);
// Точки идут по возрастанию площади, их не больше, чем диапазонов: amountAt ищет первую точку больше площади.
const isPoint = (v: unknown): v is Point => Array.isArray(v) && v.length === 3 && positive(v[0]) && positive(v[1]) && isCount(v[2]);
const isPoints = (v: unknown, max: number): v is Point[] =>
  Array.isArray(v) && v.length <= max && v.every(isPoint) && v.every((p, i) => i === 0 || v[i - 1][0] < p[0]);
const isProject = (v: unknown, max: number) =>
  isObject(v) && isText(v.name) && isPoints(v.sales, max) && isPoints(v.rents, max) && v.sales.length + v.rents.length > 0;
const isArea = (v: unknown, bandIds: string[]) =>
  isObject(v) &&
  isText(v.name) &&
  isText(v.rentArea) &&
  isObject(v.bands) &&
  Object.entries(v.bands).every(([id, band]) => bandIds.includes(id) && isBand(band)) &&
  // Файл без проектов от прошлой версии сборки тоже годится
  (v.projects === undefined || (Array.isArray(v.projects) && v.projects.length <= 1000 && v.projects.every((p) => isProject(p, bandIds.length))));

// Граница доверия: data.json приходит извне, поэтому проверяется вся структура.
// Пределы размеров с большим запасом: подделка не должна подвешивать страницу.
export function parseHintData(raw: unknown): HintData | null {
  if (!isObject(raw)) return null;
  const { asOf, periodFrom, periodTo, config, sizeBands, areas } = raw;

  if (!isDate(asOf) || !isMonth(periodFrom) || !isMonth(periodTo) || periodFrom > periodTo) return null;

  if (!isObject(config) || !nonNegative(config.ratePct) || !validDown(config.downPaymentPct) || !validTerm(config.termYears)) return null;
  if (!isObject(config.fees) || !Object.values(config.fees).every(nonNegative)) return null;

  // Диапазоны идут по возрастанию без пересечений: подпись последнего особая.
  if (!Array.isArray(sizeBands) || sizeBands.length === 0 || sizeBands.length > 20 || !sizeBands.every(isSizeBand)) return null;
  if (!sizeBands.every((band, i) => i === 0 || sizeBands[i - 1].to <= band.from)) return null;
  const bandIds = sizeBands.map((band) => band.id);
  if (!allDifferent(bandIds)) return null;

  if (!Array.isArray(areas) || areas.length === 0 || areas.length > 1000 || !areas.every((area) => isArea(area, bandIds))) return null;
  if (!allDifferent(areas.map((area) => area.name))) return null;

  return raw as HintData;
}

const withSeparators = (n: number) => n.toLocaleString('en-US');

// Сумма идёт по прямой между медианными площадями диапазонов, поэтому на границах нет скачков. За крайними точками действует их цена за м².
function amountAt(points: Array<{ size: number; perSqm: number }>, sizeSqm: number): number {
  const next = points.findIndex((p) => sizeSqm < p.size);
  if (next === 0) return points[0].perSqm * sizeSqm;
  if (next === -1) return points[points.length - 1].perSqm * sizeSqm;
  const low = points[next - 1];
  const high = points[next];
  const lowAmount = low.perSqm * low.size;
  return lowAmount + ((high.perSqm * high.size - lowAmount) * (sizeSqm - low.size)) / (high.size - low.size);
}

const sum = (points: Point[]) => points.reduce((total, p) => total + p[2], 0);
const counted = (n: number, word: string) => `${withSeparators(n)} ${n === 1 ? word : `${word}s`}`;

function projectIn(area: Area | undefined, name: string): Project | undefined {
  const wanted = name.trim().toLowerCase();
  return wanted ? area?.projects?.find((p) => p.name.toLowerCase() === wanted) : undefined;
}

// Проект заменяет сторону, по которой у него есть сделки, даже одна: в обратной проверке это точнее района. Другая сторона остаётся от района.
export function hintFor(data: HintData, areaName: string, sizeSqm: number, projectName = ''): Hint | null {
  const area = data.areas.find((a) => a.name === areaName);
  const exact = data.sizeBands.find((b) => sizeSqm >= b.from && sizeSqm < b.to);
  if (!area || !exact) return null;

  // Для площади без своей статистики подпись называет ближайший по метрам диапазон этого района.
  const distance = (b: SizeBand) => Math.max(b.from - sizeSqm, sizeSqm - b.to, 0);
  const usable = data.sizeBands.filter((b) => isBand(area.bands[b.id]));
  const band = usable.includes(exact) ? exact : usable.reduce<SizeBand | null>((best, b) => (!best || distance(b) < distance(best) ? b : best), null);
  if (!band) return null;
  const pair = area.bands[band.id];

  const pairs = usable.map((b) => area.bands[b.id]);
  const project = projectIn(area, projectName);
  const fromProject = (points: Point[]) => amountAt(points.map(([size, perSqm]) => ({ size, perSqm })), sizeSqm);
  const salePrice = project?.sales.length ? fromProject(project.sales) : amountAt(pairs.map((p) => ({ size: p.saleSizeSqm, perSqm: p.salePerSqm })), sizeSqm);
  const yearlyRent = project?.rents.length
    ? fromProject(project.rents)
    : amountAt(pairs.map((p) => ({ size: p.rentSizeSqm, perSqm: p.rentPerSqmYear })), sizeSqm);
  const price = Math.round(salePrice / 1000) * 1000;
  const monthlyRent = Math.round(yearlyRent / 12 / 100) * 100;
  if (!positive(price) || !positive(monthlyRent)) return null;

  const isLast = band === data.sizeBands[data.sizeBands.length - 1];
  const sizes = isLast ? `${withSeparators(band.from)}+` : `${withSeparators(band.from)}–${withSeparators(band.to)}`;
  const rentNote = area.rentArea === area.name ? '' : ` Rent is based on ${area.rentArea}.`;
  if (project) {
    const sales = counted(sum(project.sales), 'sale');
    const rents = counted(sum(project.rents), 'rental contract');
    let caption = `Estimate for ${project.name} from ${sales} and ${rents} in this project.`;
    if (!project.rents.length) {
      caption = `Price for ${project.name} from ${sales} in this project. Rent is the ${area.rentArea} estimate from ${withSeparators(pair.rents)} rental contracts at ${sizes} m²: none in this project.`;
    } else if (!project.sales.length) {
      caption = `Rent for ${project.name} from ${rents} in this project. Price is the ${area.name} estimate from ${withSeparators(pair.sales)} sales at ${sizes} m²: none in this project.`;
    }
    return { price, monthlyRent, caption };
  }

  const deals = `${withSeparators(pair.sales)} sales and ${withSeparators(pair.rents)} rental contracts`;
  const own = band === exact;
  let caption = own ? `Estimate for ${area.name}, ${sizes} m², from ${deals}.` : `Estimate for ${area.name} based on ${sizes} m² flats, from ${deals}: too few deals at this size.`;
  if (usable.length > 1) {
    caption = own
      ? `Estimate for ${area.name}, smoothed across nearby sizes. At ${sizes} m²: ${deals}.`
      : `Estimate for ${area.name} from nearby sizes: too few deals at this size. Closest, ${sizes} m²: ${deals}.`;
  }
  return { price, monthlyRent, caption: caption + rentNote };
}

export function applyHint(money: Money, hint: Hint | null): Money {
  if (hint) return { price: String(hint.price), rent: String(hint.monthlyRent), hintedPrice: true, hintedRent: true };
  return { price: money.hintedPrice ? '' : money.price, rent: money.hintedRent ? '' : money.rent, hintedPrice: false, hintedRent: false };
}

const toNumber = (text: string) => (text === '' ? NaN : Number(text));

export function invalidField({ price, rent, downPaymentPct, ratePct, termYears }: Fields): string | null {
  if (price !== '' && !positive(toNumber(price))) return 'Enter a property price above 0';
  if (rent !== '' && !nonNegative(toNumber(rent))) return 'Rent cannot be negative';
  if (!validDown(toNumber(downPaymentPct))) return 'Down payment must be from 0 to 99%';
  if (!nonNegative(toNumber(ratePct))) return 'Interest rate cannot be negative';
  if (!validTerm(toNumber(termYears))) return 'Term must be a whole number from 1 to 25 years';
  return null;
}

export function evaluate(fields: Fields, fees?: Partial<Fees>) {
  const error = invalidField(fields);
  const rent = toNumber(fields.rent);
  const result =
    error || fields.price === ''
      ? null
      : calculate({
          price: Number(fields.price),
          monthlyRent: Number(fields.rent), // пустая аренда даёт 0: на платёж и деньги она не влияет
          downPaymentPct: Number(fields.downPaymentPct),
          ratePct: Number(fields.ratePct),
          termYears: Number(fields.termYears),
          fees,
        });
  return { error, rent: nonNegative(rent) ? rent : null, result };
}

export function settingsFor(edited: Partial<Settings>, config?: Config): Settings {
  const base = config ?? DEFAULTS;
  return {
    downPaymentPct: edited.downPaymentPct ?? String(base.downPaymentPct),
    ratePct: edited.ratePct ?? String(base.ratePct),
    termYears: edited.termYears ?? String(base.termYears),
  };
}

export function loanSummary({ downPaymentPct, ratePct, termYears }: Settings): string {
  const show = (text: string) => (Number.isFinite(toNumber(text)) ? String(Number(text)) : '—');
  return `Loan: ${show(downPaymentPct)}% down, ${show(ratePct)}% rate, ${show(termYears)} ${Number(termYears) === 1 ? 'year' : 'years'}`;
}

export function formatMoney(value: number | null | undefined): string {
  return nonNegative(value) ? `AED ${withSeparators(Math.round(value) + 0)}` : '—'; // + 0 превращает -0 в 0
}

// Текст — только факт в дирхамах; знак разницы нужен экрану для галочки или крестика.
export function comparison(rent: number | null, payment: number | null | undefined): { text: string; sign: number } | null {
  if (!positive(rent) || !nonNegative(payment)) return null;
  const difference = Math.round(payment) - Math.round(rent);
  const text =
    difference === 0
      ? 'The mortgage payment is about the same as rent.'
      : `The mortgage payment is ${formatMoney(Math.abs(difference))} a month ${difference > 0 ? 'higher' : 'lower'} than rent.`;
  return { text, sign: Math.sign(difference) };
}

// Даты разбираются как строки, без Date: часовой пояс браузера не должен менять текст.
const monthName = (month: string) => MONTHS[Number(month) - 1];

export function formatPeriod(from: string, to: string): string {
  const [fromYear, fromMonth] = from.split('-');
  const [toYear, toMonth] = to.split('-');
  const start = fromYear === toYear ? monthName(fromMonth) : `${monthName(fromMonth)} ${fromYear}`;
  return `${start}–${monthName(toMonth)} ${toYear}`;
}

export function formatDate(date: string): string {
  const [year, month, day] = date.split('-');
  return `${Number(day)} ${monthName(month)} ${year}`;
}

export function disclaimer(data: HintData | null): string {
  const base = 'Indicative estimates, not an offer or a valuation. Final terms and approval depend on the lender.';
  if (!data) return base;
  return `${base} Area and project estimates are median prices and rents from Dubai Land Department registrations, ${formatPeriod(data.periodFrom, data.periodTo)}, data as of ${formatDate(data.asOf)}. A specific property can differ significantly.`;
}
