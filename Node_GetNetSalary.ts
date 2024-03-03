import 'dotenv/config';

const GrossSalary: number = parseFloat(process.env.GrossSalary || '0');

function GrossToNet(): string {
    const Unemployment: number = GrossSalary * 0.016;
    const Pension: number = GrossSalary * 0.02;
    const TaxableIncome: number = GrossSalary - Pension - Unemployment;
    let Untaxed: number;

    if (GrossSalary > 2100) {
        Untaxed = 0;
    } else if (TaxableIncome < 654) {
        Untaxed = TaxableIncome;
    } else if (GrossSalary <= 1200) {
        Untaxed = 654;
    } else {
        Untaxed = 654 - (654 / 900) * (GrossSalary - 1200);
    };

    const IncomeTax: number = (TaxableIncome - Untaxed) * 0.2;
    const NetSalary: string = (TaxableIncome - IncomeTax).toFixed(0);
    console.log('Net salary: ' + NetSalary);
    return NetSalary;
};

export default GrossToNet;