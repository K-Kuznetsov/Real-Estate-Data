import Swedbank from './Puppeteer_Swedbank';
import Luminor from './Puppeteer_Luminor';
import Coop from './Puppeteer_Coop';

async function CompareBanks(NetSalary: string): Promise<string> {
    const BankPromises = Promise.all([
        Swedbank(NetSalary),
        Luminor(NetSalary),
        Coop(NetSalary)
    ]);
    const BankResults = await BankPromises;
    const BankAmounts = BankResults.map(amount => {
        return parseFloat(amount);
    });

    const PriceLimit: string = Math.max(...BankAmounts).toString();
    console.log('Highest amount: ' + PriceLimit);
    return PriceLimit;
};

export default CompareBanks;