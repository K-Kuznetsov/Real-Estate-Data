import { GrossSalary } from './PrivateData.json';

function grossToNet(): string {
    const unemployment: number = GrossSalary * 0.016;
    const pension: number = GrossSalary * 0.02;
    const taxableIncome: number = GrossSalary - pension - unemployment;
    let untaxed: number;

    if (GrossSalary > 2100) {
        untaxed = 0;
    } else if (taxableIncome < 654) {
        untaxed = taxableIncome;
    } else if (GrossSalary <= 1200) {
        untaxed = 654;
    } else {
        untaxed = 654 - (654 / 900) * (GrossSalary - 1200);
    };

    const incomeTax: number = (taxableIncome - untaxed) * 0.2;
    const netSalary: string = (taxableIncome - incomeTax).toFixed(0);
    console.log('Net salary: ' + netSalary);
    return netSalary;
};

export default grossToNet;