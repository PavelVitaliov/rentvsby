import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { calculate, type Input } from './calc.ts';

const noFees = {
  vatPct: 5,
  valuationFee: 0,
  titleDeedFee: 0,
  knowledgeFee: 0,
  innovationFee: 0,
  adminMortgageFee: 0,
  processingFeePct: 0,
  propertyInsurancePct: 0,
  lifeInsurancePct: 0,
};
const input: Input = { price: 1500000, monthlyRent: 8500, downPaymentPct: 20, ratePct: 5, termYears: 25, fees: noFees };

test('считает платёж как калькулятор сайта', () => {
  assert.equal(Math.round(calculate(input)!.monthlyPayment), 7015);
});

test('считает деньги на старте', () => {
  const result = calculate(input)!;
  assert.equal(result.downPayment, 300000);
  assert.equal(Math.round(result.purchaseFees), 97200);
  assert.equal(Math.round(result.cashAtStart), 397200);
});

test('добавляет сборы из настроек', () => {
  const fees = { ...noFees, valuationFee: 1, titleDeedFee: 2, knowledgeFee: 3, innovationFee: 4, adminMortgageFee: 5, processingFeePct: 1 };
  assert.equal(Math.round(calculate({ ...input, fees })!.purchaseFees), 97200 + 15 + 12000);
});

test('считает без сборов из настроек и отмечает это', () => {
  const { fees, ...withoutFees } = input;
  const result = calculate(withoutFees)!;
  assert.equal(Math.round(result.monthlyPayment), 7015);
  assert.equal(Math.round(result.purchaseFees), 97200);
  assert.equal(result.feesComplete, false);
  assert.equal(calculate(input)!.feesComplete, true);
  assert.equal(calculate({ ...input, fees: { vatPct: 5 } })!.feesComplete, false);
});

test('сходится с вкладкой «Калькулятор» таблицы клиента', () => {
  const fees = JSON.parse(readFileSync(new URL('../../data/settings.json', import.meta.url), 'utf8')).fees;
  const result = calculate({ ...input, price: 1400000, fees })!;
  // В таблице 98 520: регистрация ипотеки там 0,25% от цены, а по подписи и правилу DLD — от кредита (−700).
  assert.equal(Math.round(result.purchaseFees), 98520 - 700);
  // Страховки: 1 750 в год и 0,01212% цены в месяц.
  const withoutInsurance = calculate({ ...input, price: 1400000, fees: { ...fees, propertyInsurancePct: 0, lifeInsurancePct: 0 } })!;
  assert.equal(Math.round((result.monthlyPayment - withoutInsurance.monthlyPayment) * 100), Math.round((1750 / 12 + 169.68) * 100));
  assert.equal(result.feesComplete, true);
});

test('трасти дешевле для объекта до 500 000', () => {
  assert.equal(Math.round(calculate({ ...input, price: 400000 })!.purchaseFees), 16000 + 8000 + 800 + 2100);
});

test('работает при нулевой ставке', () => {
  assert.equal(calculate({ ...input, ratePct: 0 })!.monthlyPayment, 4000);
});

test('не считает при неверных значениях', () => {
  for (const bad of [{ price: 0 }, { price: NaN }, { monthlyRent: -1 }, { downPaymentPct: 100 }, { ratePct: -1 }, { termYears: 0 }]) {
    assert.equal(calculate({ ...input, ...bad }), null);
  }
});
