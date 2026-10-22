export const SALARY_PERIODS = ["hourly", "monthly", "yearly"] as const;

export type SalaryPeriod = (typeof SALARY_PERIODS)[number];

export interface SalaryRange {
  minimum?: number;
  maximum?: number;
  currency: string;
  period: SalaryPeriod;
}
