/**
 * COSMEFLOW IMPROVE: COST OF LOSS & SAVING ENGINE
 * 
 * Strict Financial Integrity:
 * - Anti-Fake-Saving Rule: Productivity gains and released capacities are separate from Hard Savings.
 * - Dynamic configurable parameters with transparent assumptions.
 */

export interface LaborLossInput {
  lostMinutesPerOcc: number;
  frequencyPerShift: number;
  shiftsPerDay: number;
  workingDaysPerMonth: number;
  numberOfPeople: number;
  laborCostRate: number; // THB/Hour
}

export interface LaborLossResult {
  lostHoursPerMonth: number;
  monthlyLossThb: number;
  annualLossThb: number;
  assumptionText: string;
}

export function calculateLaborLoss(input: LaborLossInput): LaborLossResult {
  const {
    lostMinutesPerOcc = 0,
    frequencyPerShift = 0,
    shiftsPerDay = 1,
    workingDaysPerMonth = 26,
    numberOfPeople = 1,
    laborCostRate = 85.0
  } = input;

  // Formula: Lost Minutes * Freq * Shifts * Days * People / 60
  const totalLostMinutes = lostMinutesPerOcc * frequencyPerShift * shiftsPerDay * workingDaysPerMonth * numberOfPeople;
  const lostHoursPerMonth = Number((totalLostMinutes / 60).toFixed(2));
  const monthlyLossThb = Number((lostHoursPerMonth * laborCostRate).toFixed(2));
  const annualLossThb = Number((monthlyLossThb * 12).toFixed(2));

  const assumptionText = `พนักงาน ${numberOfPeople} คน สูญเสียเวลาครั้งละ ${lostMinutesPerOcc} นาที ความถี่ ${frequencyPerShift} ครั้ง/กะ (${shiftsPerDay} กะ/วัน, ${workingDaysPerMonth} วัน/เดือน) อัตราค่าแรง ${laborCostRate.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท/ชม.`;

  return {
    lostHoursPerMonth,
    monthlyLossThb,
    annualLossThb,
    assumptionText
  };
}

export interface MetricImprovementInput {
  beforeValue: number;
  afterValue: number;
  higherIsBetter?: boolean;
}

export function calculateMetricImprovement(input: MetricImprovementInput): number {
  const { beforeValue, afterValue, higherIsBetter = false } = input;
  if (!beforeValue || beforeValue <= 0) return 0;

  if (higherIsBetter) {
    return Number((((afterValue - beforeValue) / beforeValue) * 100).toFixed(2));
  } else {
    return Number((((beforeValue - afterValue) / beforeValue) * 100).toFixed(2));
  }
}
