import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyHint,
  comparison,
  disclaimer,
  evaluate,
  formatDate,
  formatMoney,
  formatPeriod,
  hintFor,
  invalidField,
  loanSummary,
  parseHintData,
  settingsFor,
  type Fields,
  type HintData,
  type Money,
} from './hints.ts';

const data: HintData = {
  asOf: '2026-10-31',
  periodFrom: '2026-05',
  periodTo: '2026-10',
  config: { ratePct: 4.5, downPaymentPct: 25, termYears: 20, fees: { vatPct: 5 } },
  sizeBands: [
    { id: '15-50', from: 15, to: 50 },
    { id: '50-90', from: 50, to: 90 },
    { id: '90-140', from: 90, to: 140 },
    { id: '140+', from: 140, to: 1000 },
  ],
  areas: [
    {
      name: 'Dubai Marina',
      rentArea: 'Marsa Dubai',
      bands: {
        '50-90': { salePerSqm: 21536, saleSizeSqm: 70, sales: 310, rentPerSqmYear: 1180, rentSizeSqm: 70, rents: 2752 },
        '140+': { salePerSqm: 30000, saleSizeSqm: 170, sales: 1200, rentPerSqmYear: 1500, rentSizeSqm: 170, rents: 45 },
      },
      projects: [
        { name: 'Marina Gate', sales: [[60, 25000, 2], [100, 24000, 1]], rents: [[60, 1300, 5]] },
        { name: 'Old Tower', sales: [[70, 15000, 1]], rents: [] },
        { name: 'Rented', sales: [], rents: [[70, 1200, 1]] },
      ],
    },
    {
      name: 'Business Bay',
      rentArea: 'Business Bay',
      bands: { '15-50': { salePerSqm: 25000, saleSizeSqm: 38, sales: 40, rentPerSqmYear: 1400, rentSizeSqm: 38, rents: 60 } },
    },
  ],
};

// Копия data с одной поломкой
const broken = (change: (d: any) => void) => {
  const copy = structuredClone(data);
  change(copy);
  return copy;
};

test('принимает верные данные', () => {
  assert.deepEqual(parseHintData(structuredClone(data)), data);
  assert.ok(parseHintData(broken((d) => (d.config.fees = {}))));
  assert.ok(parseHintData(broken((d) => (d.config = { ratePct: 0, downPaymentPct: 0, termYears: 1, fees: { vatPct: 0 } }))));
  assert.ok(parseHintData(broken((d) => (d.config.downPaymentPct = 99))));
  assert.ok(parseHintData(broken((d) => (d.config.termYears = 25))));
  assert.ok(parseHintData(broken((d) => (d.areas[0].bands = {}))), 'район без пар не ломает файл');
  assert.ok(parseHintData(broken((d) => ((d.periodFrom = '2026-11'), (d.periodTo = '2027-04')))));
});

test('отклоняет всё, что не объект', () => {
  for (const raw of [null, undefined, 'text', 5, [], [data]]) assert.equal(parseHintData(raw), null);
});

test('отклоняет неверные даты', () => {
  const cases: Array<(d: any) => void> = [
    (d) => delete d.asOf,
    (d) => (d.asOf = 20261031),
    (d) => (d.asOf = '31-10-2026'),
    (d) => (d.asOf = '2026-13-01'),
    (d) => (d.asOf = '2026-02-31'),
    (d) => delete d.periodFrom,
    (d) => (d.periodFrom = '2026-13'),
    (d) => (d.periodFrom = ['2026-05']),
    (d) => (d.periodTo = '2026-10-31'),
    (d) => (d.periodFrom = '2026-11'), // начало позже конца
  ];
  for (const change of cases) assert.equal(parseHintData(broken(change)), null, String(change));
});

test('отклоняет неверный config', () => {
  const cases: Array<(d: any) => void> = [
    (d) => delete d.config,
    (d) => (d.config = []),
    (d) => (d.config.ratePct = -1),
    (d) => (d.config.ratePct = '5'),
    (d) => (d.config.ratePct = Infinity),
    (d) => (d.config.downPaymentPct = -1),
    (d) => (d.config.downPaymentPct = 99.5),
    (d) => (d.config.downPaymentPct = null),
    (d) => (d.config.termYears = 0),
    (d) => (d.config.termYears = 26),
    (d) => (d.config.termYears = 2.5),
    (d) => delete d.config.termYears,
    (d) => delete d.config.fees,
    (d) => (d.config.fees = []),
    (d) => (d.config.fees.vatPct = -1),
    (d) => (d.config.fees.vatPct = '5'),
    (d) => (d.config.fees.vatPct = Infinity),
  ];
  for (const change of cases) assert.equal(parseHintData(broken(change)), null, String(change));
});

test('отклоняет неверные диапазоны', () => {
  const cases: Array<(d: any) => void> = [
    (d) => delete d.sizeBands,
    (d) => (d.sizeBands = []),
    (d) => (d.sizeBands = {}),
    (d) => (d.sizeBands[0] = null),
    (d) => (d.sizeBands[0].id = ''),
    (d) => (d.sizeBands[0].from = 0),
    (d) => (d.sizeBands[0].from = '15'),
    (d) => (d.sizeBands[0].to = 15), // не больше from
    (d) => (d.sizeBands[1].from = 40), // пересекается с предыдущим
    (d) => (d.sizeBands[1].id = '15-50'), // повтор id
  ];
  for (const change of cases) assert.equal(parseHintData(broken(change)), null, String(change));
});

test('отклоняет неверные районы и суммы', () => {
  const cases: Array<(d: any) => void> = [
    (d) => delete d.areas,
    (d) => (d.areas = []),
    (d) => (d.areas[0] = 'Dubai Marina'),
    (d) => (d.areas[0].name = ''),
    (d) => (d.areas[0].name = 5),
    (d) => delete d.areas[0].rentArea,
    (d) => (d.areas[1].name = 'Dubai Marina'), // повтор названия
    (d) => delete d.areas[0].bands,
    (d) => (d.areas[0].bands = []),
    (d) => (d.areas[0].bands['20-30'] = d.areas[0].bands['50-90']), // диапазона нет в sizeBands
    (d) => (d.areas[0].bands['50-90'] = 1),
    (d) => (d.areas[0].bands['50-90'].salePerSqm = 0),
    (d) => (d.areas[0].bands['50-90'].salePerSqm = Infinity),
    (d) => (d.areas[0].bands['50-90'].rentPerSqmYear = '1180'),
    (d) => (d.areas[0].bands['50-90'].sales = 0),
    (d) => (d.areas[0].bands['50-90'].sales = 1.5),
    (d) => (d.areas[0].bands['50-90'].rents = -1),
    (d) => delete d.areas[0].bands['50-90'].rents,
    (d) => delete d.areas[0].bands['50-90'].saleSizeSqm,
    (d) => (d.areas[0].bands['50-90'].saleSizeSqm = 0),
    (d) => (d.areas[0].bands['50-90'].rentSizeSqm = '70'),
    (d) => (d.areas[0].bands['50-90'].rentSizeSqm = Infinity),
  ];
  for (const change of cases) assert.equal(parseHintData(broken(change)), null, String(change));
});

test('отклоняет неверные проекты', () => {
  const cases: Array<(d: any) => void> = [
    (d) => (d.areas[0].projects = {}),
    (d) => (d.areas[0].projects[0] = 'Marina Gate'),
    (d) => (d.areas[0].projects[0].name = ''),
    (d) => (d.areas[0].projects[0].name = 'x'.repeat(101)),
    (d) => delete d.areas[0].projects[0].rents,
    (d) => (d.areas[0].projects[0].sales = {}),
    (d) => (d.areas[0].projects[0].sales[0] = [60, 25000]),
    (d) => (d.areas[0].projects[0].sales[0] = [60, 25000, 2, 1]),
    (d) => (d.areas[0].projects[0].sales[0][0] = 0),
    (d) => (d.areas[0].projects[0].sales[0][1] = '25000'),
    (d) => (d.areas[0].projects[0].sales[0][2] = 1.5),
    (d) => (d.areas[0].projects[0].sales[1][0] = 60), // не по возрастанию площади
    (d) => (d.areas[0].projects[0].sales = [1, 2, 3, 4, 5].map((i) => [i * 10, 1000, 1])), // точек больше, чем диапазонов
    (d) => ((d.areas[0].projects[1].sales = []), (d.areas[0].projects[1].rents = [])),
    (d) => (d.areas[0].projects = Array.from({ length: 1001 }, (_, i) => ({ name: `p${i}`, sales: [[70, 1000, 1]], rents: [] }))),
  ];
  for (const change of cases) assert.equal(parseHintData(broken(change)), null, String(change));
  assert.ok(parseHintData(broken((d) => (d.areas[0].projects = []))));
  assert.ok(parseHintData(broken((d) => (d.areas[0].projects[0].sales = [1, 2, 3, 4].map((i) => [i * 10, 1000, 1])))));
});

test('отклоняет файл абсурдных размеров и принимает границы', () => {
  const long = 'x'.repeat(101);
  const bands = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `b${i}`, from: i + 1, to: i + 2 }));
  const areas = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `a${i}`, rentArea: 'r', bands: {} }));
  const cases: Array<(d: any) => void> = [
    (d) => (d.areas[0].name = long),
    (d) => (d.areas[0].rentArea = long),
    (d) => ((d.sizeBands[0].id = long), (d.areas[1].bands = {})),
    (d) => ((d.sizeBands = bands(21)), (d.areas = areas(1))),
    (d) => (d.areas = areas(1001)),
  ];
  for (const change of cases) assert.equal(parseHintData(broken(change)), null, String(change));
  assert.ok(parseHintData(broken((d) => (d.areas[0].name = long.slice(1)))));
  assert.ok(parseHintData(broken((d) => ((d.sizeBands = bands(20)), (d.areas = areas(1))))));
  assert.ok(parseHintData(broken((d) => (d.areas = areas(1000)))));
});

test('считает подсказку с округлением', () => {
  const hint = hintFor(data, 'Dubai Marina', 70)!;
  assert.equal(hint.price, 1508000); // 21536 × 70 = 1 507 520
  assert.equal(hint.monthlyRent, 6900); // 1180 × 70 / 12 = 6883,33
});

test('за крайними точками района действует их цена за м²', () => {
  assert.equal(hintFor(data, 'Dubai Marina', 50)!.price, 1077000); // 21536 × 50
  assert.equal(hintFor(data, 'Dubai Marina', 20)!.price, 431000);
  assert.equal(hintFor(data, 'Dubai Marina', 999)!.price, 29970000); // 30000 × 999
  assert.equal(hintFor(data, 'Business Bay', 15)!.price, 375000);
  assert.equal(hintFor(data, 'Business Bay', 70)!.monthlyRent, 8200); // единственная точка района: 1400 × 70 / 12
});

test('между точками сумма идёт по прямой, в том числе через диапазон без статистики', () => {
  assert.equal(hintFor(data, 'Dubai Marina', 120)!.price, 3304000); // середина между 1 507 520 и 5 100 000
  assert.equal(hintFor(data, 'Dubai Marina', 120)!.monthlyRent, 14100); // середина между 82 600 и 255 000, делённая на 12
  assert.equal(hintFor(data, 'Dubai Marina', 170)!.price, 5100000); // сама точка
});

test('площадь и цена за м² берутся со своей стороны', () => {
  const split = broken((d) => (d.areas[0].bands['50-90'].rentSizeSqm = 120));
  assert.equal(hintFor(split, 'Dubai Marina', 120)!.price, 3304000);
  assert.equal(hintFor(split, 'Dubai Marina', 120)!.monthlyRent, 11800); // 1180 × 120 / 12
});

test('с ростом площади оценка не падает и нет скачков на границах', () => {
  let last = hintFor(data, 'Dubai Marina', 15)!;
  for (let size = 16; size < 1000; size++) {
    const hint = hintFor(data, 'Dubai Marina', size)!;
    assert.ok(hint.price >= last.price && hint.monthlyRent >= last.monthlyRent, String(size));
    assert.ok(hint.price - last.price <= 40000, String(size));
    last = hint;
  }
});

test('подпись называет диапазон, из которого взята оценка', () => {
  assert.equal(
    hintFor(data, 'Business Bay', 70)!.caption,
    'Estimate for Business Bay based on 15–50 m² flats, from 40 sales and 60 rental contracts: too few deals at this size.',
  );
  assert.equal(
    hintFor(data, 'Dubai Marina', 139)!.caption,
    'Estimate for Dubai Marina from nearby sizes: too few deals at this size. Closest, 140+ m²: 1,200 sales and 45 rental contracts. Rent is based on Marsa Dubai.',
  );
});

test('нет подсказки вне диапазонов, в районе без пар и без района', () => {
  for (const size of [14.99, 1000, 0, -5, NaN, Infinity]) assert.equal(hintFor(data, 'Dubai Marina', size), null);
  assert.equal(hintFor(broken((d) => (d.areas[1].bands = {})), 'Business Bay', 70), null);
  assert.equal(hintFor(data, 'Nowhere', 70), null);
  assert.equal(hintFor(data, '', 70), null);
});

test('подсказка не даёт Infinity, ноль и свойства Object.prototype', () => {
  const huge = broken((d) => (d.areas[0].bands['50-90'].salePerSqm = 1e308));
  assert.equal(hintFor(huge, 'Dubai Marina', 70), null);
  const tiny = broken((d) => (d.areas[0].bands['50-90'].salePerSqm = 1));
  assert.equal(hintFor(tiny, 'Dubai Marina', 70), null);
  const proto = broken((d) => (d.sizeBands[1].id = 'constructor'));
  assert.equal(hintFor(proto, 'Dubai Marina', 70)!.price, 2100000); // свойство Object не считается парой, взят 140+: 30000 × 70
});

test('проект заменяет район по своим точкам и площади', () => {
  const at60 = hintFor(data, 'Dubai Marina', 60, 'Marina Gate')!;
  assert.equal(at60.price, 1500000); // 25000 × 60
  assert.equal(at60.monthlyRent, 6500); // 1300 × 60 / 12
  const at80 = hintFor(data, 'Dubai Marina', 80, 'Marina Gate')!;
  assert.equal(at80.price, 1950000); // середина между 1 500 000 и 2 400 000
  assert.equal(at80.monthlyRent, 8700); // единственная точка: 1300 × 80 / 12
  assert.equal(at80.caption, 'Estimate for Marina Gate from 3 sales and 5 rental contracts in this project.');
});

test('сторона без сделок проекта берётся от района', () => {
  const sold = hintFor(data, 'Dubai Marina', 70, 'Old Tower')!;
  assert.deepEqual([sold.price, sold.monthlyRent], [1050000, 6900]); // 15000 × 70; аренда района, как без проекта
  assert.equal(
    sold.caption,
    'Price for Old Tower from 1 sale in this project. Rent is the Marsa Dubai estimate from 2,752 rental contracts at 50–90 m²: none in this project.',
  );
  const rented = hintFor(data, 'Dubai Marina', 70, 'Rented')!;
  assert.deepEqual([rented.price, rented.monthlyRent], [1508000, 7000]); // цена района; 1200 × 70 / 12
  assert.equal(rented.caption, 'Rent for Rented from 1 rental contract in this project. Price is the Dubai Marina estimate from 310 sales at 50–90 m²: none in this project.');
});

test('название проекта без учёта регистра и пробелов, чужой или неизвестный проект даёт район', () => {
  assert.equal(hintFor(data, 'Dubai Marina', 60, '  marina GATE ')!.price, 1500000);
  for (const [area, project] of [['Dubai Marina', 'Marina'], ['Dubai Marina', ''], ['Business Bay', 'Marina Gate']]) {
    assert.deepEqual(hintFor(data, area, 60, project), hintFor(data, area, 60), `${area} / ${project}`);
  }
  assert.equal(hintFor(data, 'Dubai Marina', 1000, 'Marina Gate'), null);
});

test('сравнение платежа с арендой: текст и знак разницы', () => {
  assert.deepEqual(comparison(6900, 7052.4), { text: 'The mortgage payment is AED 152 a month higher than rent.', sign: 1 });
  assert.deepEqual(comparison(8500, 7015.08), { text: 'The mortgage payment is AED 1,485 a month lower than rent.', sign: -1 });
  assert.deepEqual(comparison(7015, 7015.2), { text: 'The mortgage payment is about the same as rent.', sign: 0 });
  for (const [rent, payment] of [[null, 7000], [0, 7000], [7000, undefined], [7000, Infinity]] as const) assert.equal(comparison(rent, payment), null);
});

test('подпись к подсказке', () => {
  assert.equal(
    hintFor(data, 'Dubai Marina', 70)!.caption,
    'Estimate for Dubai Marina, smoothed across nearby sizes. At 50–90 m²: 310 sales and 2,752 rental contracts. Rent is based on Marsa Dubai.',
  );
  assert.equal(hintFor(data, 'Business Bay', 30)!.caption, 'Estimate for Business Bay, 15–50 m², from 40 sales and 60 rental contracts.');
  assert.equal(
    hintFor(data, 'Dubai Marina', 150)!.caption,
    'Estimate for Dubai Marina, smoothed across nearby sizes. At 140+ m²: 1,200 sales and 45 rental contracts. Rent is based on Marsa Dubai.',
  );
});

test('подсказка заполняет оба поля и помечает их', () => {
  const empty: Money = { price: '', rent: '', hintedPrice: false, hintedRent: false };
  const filled: Money = { price: '1508000', rent: '6900', hintedPrice: true, hintedRent: true };
  const hint = hintFor(data, 'Dubai Marina', 70);
  assert.deepEqual(applyHint(empty, hint), filled);
  assert.deepEqual(applyHint({ price: '1', rent: '2', hintedPrice: false, hintedRent: false }, hint), filled);
});

test('без подсказки очищает только помеченные поля', () => {
  assert.deepEqual(applyHint({ price: '1508000', rent: '6900', hintedPrice: true, hintedRent: true }, null), {
    price: '',
    rent: '',
    hintedPrice: false,
    hintedRent: false,
  });
  assert.deepEqual(applyHint({ price: '1000000', rent: '6900', hintedPrice: false, hintedRent: true }, null), {
    price: '1000000',
    rent: '',
    hintedPrice: false,
    hintedRent: false,
  });
  const manual: Money = { price: '1000000', rent: '5000', hintedPrice: false, hintedRent: false };
  assert.deepEqual(applyHint(manual, null), manual);
});

const ok: Fields = { price: '1500000', rent: '8500', downPaymentPct: '20', ratePct: '5', termYears: '25' };

test('сообщает о неверных значениях', () => {
  const price = 'Enter a property price above 0';
  const rent = 'Rent cannot be negative';
  const down = 'Down payment must be from 0 to 99%';
  const rate = 'Interest rate cannot be negative';
  const term = 'Term must be a whole number from 1 to 25 years';
  const cases: Array<[Partial<Fields>, string]> = [
    [{ price: '0' }, price],
    [{ price: '-1' }, price],
    [{ price: '1e999' }, price],
    [{ rent: '-1' }, rent],
    [{ rent: '1e999' }, rent],
    [{ downPaymentPct: '' }, down],
    [{ downPaymentPct: '-1' }, down],
    [{ downPaymentPct: '99.5' }, down],
    [{ downPaymentPct: '1e999' }, down],
    [{ ratePct: '' }, rate],
    [{ ratePct: '-0.1' }, rate],
    [{ ratePct: '1e999' }, rate],
    [{ termYears: '' }, term],
    [{ termYears: '0' }, term],
    [{ termYears: '26' }, term],
    [{ termYears: '2.5' }, term],
  ];
  for (const [change, message] of cases) assert.equal(invalidField({ ...ok, ...change }), message, JSON.stringify(change));
});

test('пропускает верные и пустые значения', () => {
  const cases: Array<Partial<Fields>> = [
    {},
    { price: '' },
    { rent: '' },
    { rent: '0' },
    { price: '', rent: '' },
    { downPaymentPct: '0' },
    { downPaymentPct: '99' },
    { downPaymentPct: '12.5' },
    { ratePct: '0' },
    { termYears: '1' },
    { termYears: '25' },
  ];
  for (const change of cases) assert.equal(invalidField({ ...ok, ...change }), null, JSON.stringify(change));
});

test('сообщает только о первом неверном поле', () => {
  const allBad: Fields = { price: '0', rent: '-1', downPaymentPct: '', ratePct: '', termYears: '' };
  assert.equal(invalidField(allBad), 'Enter a property price above 0');
  assert.equal(invalidField({ ...allBad, price: '1' }), 'Rent cannot be negative');
  assert.equal(invalidField({ ...allBad, price: '1', rent: '1' }), 'Down payment must be from 0 to 99%');
  assert.equal(invalidField({ ...allBad, price: '1', rent: '1', downPaymentPct: '1' }), 'Interest rate cannot be negative');
  assert.equal(invalidField({ ...allBad, price: '1', rent: '1', downPaymentPct: '1', ratePct: '1' }), 'Term must be a whole number from 1 to 25 years');
});

test('считает результаты через calculate', () => {
  const { error, rent, result } = evaluate(ok);
  assert.equal(error, null);
  assert.equal(rent, 8500);
  assert.equal(Math.round(result!.monthlyPayment), 7015);
  assert.equal(Math.round(result!.cashAtStart), 397200);
  assert.equal(result!.feesComplete, false);
});

test('передаёт сборы в calculate', () => {
  assert.equal(Math.round(evaluate(ok, { valuationFee: 1000 }).result!.cashAtStart), 398200);
});

test('пустая цена: без ошибки, аренда видна, платежа и денег нет', () => {
  assert.deepEqual(evaluate({ ...ok, price: '' }), { error: null, rent: 8500, result: null });
});

test('пустая аренда: результата аренды нет, платёж и деньги считаются', () => {
  const { error, rent, result } = evaluate({ ...ok, rent: '' });
  assert.equal(error, null);
  assert.equal(rent, null);
  assert.equal(Math.round(result!.monthlyPayment), 7015);
});

test('при ошибке платежа и денег нет', () => {
  assert.deepEqual(evaluate({ ...ok, termYears: '26' }), {
    error: 'Term must be a whole number from 1 to 25 years',
    rent: 8500,
    result: null,
  });
  assert.deepEqual(evaluate({ ...ok, rent: '-1' }), { error: 'Rent cannot be negative', rent: null, result: null });
});

test('форматирует деньги', () => {
  assert.equal(formatMoney(1500000), 'AED 1,500,000');
  assert.equal(formatMoney(7014.7), 'AED 7,015');
  assert.equal(formatMoney(0), 'AED 0');
  assert.equal(formatMoney(-0), 'AED 0');
  for (const none of [null, undefined, NaN, Infinity, -Infinity]) assert.equal(formatMoney(none), '—');
});

test('нигде нет Infinity при крайних значениях', () => {
  const texts = (fields: Fields) => {
    const { rent, result } = evaluate(fields);
    return [formatMoney(rent), formatMoney(result?.monthlyPayment), formatMoney(result?.cashAtStart)].join(' ');
  };
  for (const change of [{ ratePct: '1e-20' }, { ratePct: '1e308' }, { price: '1e308' }, { rent: '1e308' }]) {
    assert.doesNotMatch(texts({ ...ok, ...change }), /NaN|Infinity/, JSON.stringify(change));
  }
});

test('форматирует период и дату в любом часовом поясе', () => {
  const zone = process.env.TZ;
  try {
    for (const tz of ['Pacific/Kiritimati', 'Pacific/Pago_Pago', 'Asia/Dubai']) {
      process.env.TZ = tz;
      assert.equal(formatPeriod('2026-05', '2026-10'), 'May–Oct 2026');
      assert.equal(formatPeriod('2026-11', '2027-04'), 'Nov 2026–Apr 2027');
      assert.equal(formatDate('2026-10-31'), '31 Oct 2026');
      assert.equal(formatDate('2026-01-01'), '1 Jan 2026');
      assert.ok(parseHintData(broken((d) => (d.asOf = '2026-01-01'))));
      assert.ok(parseHintData(broken((d) => (d.asOf = '2026-12-31'))));
    }
  } finally {
    if (zone === undefined) delete process.env.TZ;
    else process.env.TZ = zone;
  }
});

test('настройки: запасные значения, config и правки пользователя', () => {
  assert.deepEqual(settingsFor({}), { downPaymentPct: '20', ratePct: '3.99', termYears: '25' });
  assert.deepEqual(settingsFor({}, data.config), { downPaymentPct: '25', ratePct: '4.5', termYears: '20' });
  assert.deepEqual(settingsFor({ ratePct: '', termYears: '10' }, data.config), { downPaymentPct: '25', ratePct: '', termYears: '10' });
  assert.deepEqual(settingsFor({ downPaymentPct: '30' }), { downPaymentPct: '30', ratePct: '3.99', termYears: '25' });
});

test('сводка настроек', () => {
  const base = { downPaymentPct: '20', ratePct: '5', termYears: '25' };
  assert.equal(loanSummary(base), 'Loan: 20% down, 5% rate, 25 years');
  assert.equal(loanSummary({ ...base, termYears: '1' }), 'Loan: 20% down, 5% rate, 1 year');
  assert.equal(loanSummary({ downPaymentPct: '', ratePct: '', termYears: '' }), 'Loan: —% down, —% rate, — years');
});

test('текст внизу', () => {
  const base = 'Indicative estimates, not an offer or a valuation. Final terms and approval depend on the lender.';
  assert.equal(disclaimer(null), base);
  assert.equal(
    disclaimer(data),
    `${base} Area and project estimates are median prices and rents from Dubai Land Department registrations, May–Oct 2026, data as of 31 Oct 2026. A specific property can differ significantly.`,
  );
});
