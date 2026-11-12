// Сборы при покупке. Значения приходят из настроек; пока их нет, сумма считается без них.
export type Fees = {
  vatPct: number;
  valuationFee: number;
  titleDeedFee: number;
  knowledgeFee: number;
  innovationFee: number;
  adminMortgageFee: number;
  processingFeePct: number;
  propertyInsurancePct: number; // в год от цены
  lifeInsurancePct: number; // в месяц от цены
};

export type Input = {
  price: number;
  monthlyRent: number;
  downPaymentPct: number;
  ratePct: number;
  termYears: number;
  fees?: Partial<Fees>;
};

const FEE_KEYS = ['vatPct', 'valuationFee', 'titleDeedFee', 'knowledgeFee', 'innovationFee', 'adminMortgageFee', 'processingFeePct', 'propertyInsurancePct', 'lifeInsurancePct'] as const;
const STANDARD_VAT_PCT = 5; // ставка НДС в ОАЭ, пока нет значения из настроек

export type Result = {
  monthlyRent: number;
  monthlyPayment: number;
  downPayment: number;
  purchaseFees: number;
  cashAtStart: number;
  feesComplete: boolean; // false: часть сборов неизвестна, сумма на старте занижена
};

const positive = (n: number) => Number.isFinite(n) && n > 0;
const nonNegative = (n: number) => Number.isFinite(n) && n >= 0;

export function calculate({ price, monthlyRent, downPaymentPct, ratePct, termYears, fees = {} }: Input): Result | null {
  const valid =
    positive(price) &&
    nonNegative(monthlyRent) &&
    nonNegative(downPaymentPct) &&
    downPaymentPct < 100 &&
    nonNegative(ratePct) &&
    positive(termYears) &&
    Object.values(fees).every(nonNegative);
  if (!valid) return null;

  const downPayment = price * (downPaymentPct / 100);
  const loan = price - downPayment;
  const months = termYears * 12;
  const monthlyRate = ratePct / 100 / 12;
  const annuity = monthlyRate === 0 ? loan / months : (loan * monthlyRate) / (1 - (1 + monthlyRate) ** -months);
  // Страховки банк включает в ежемесячный платёж равными долями (вкладка «Калькулятор» в таблице клиента).
  const insurance = (price * (fees.propertyInsurancePct ?? 0)) / 100 / 12 + (price * (fees.lifeInsurancePct ?? 0)) / 100;
  const monthlyPayment = annuity + insurance;

  // Те же статьи, что в get_order_math на сайте (mortix_broker.php), кроме сбора за рефинансирование.
  const trusteeFee = (price < 500000 ? 2000 : 4000) * (1 + (fees.vatPct ?? STANDARD_VAT_PCT) / 100);
  const purchaseFees =
    price * 0.04 + // DLD
    price * 0.02 + // комиссия агента
    loan * 0.0025 + (fees.adminMortgageFee ?? 0) + // регистрация ипотеки
    (loan * (fees.processingFeePct ?? 0)) / 100 +
    trusteeFee +
    (fees.valuationFee ?? 0) +
    (fees.titleDeedFee ?? 0) +
    (fees.knowledgeFee ?? 0) +
    (fees.innovationFee ?? 0);

  return {
    monthlyRent,
    monthlyPayment,
    downPayment,
    purchaseFees,
    cashAtStart: downPayment + purchaseFees,
    feesComplete: FEE_KEYS.every((key) => fees[key] !== undefined),
  };
}
