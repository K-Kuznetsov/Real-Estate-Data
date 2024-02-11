import Swedbank from './Puppeteer_Swedbank';
import Luminor from './Puppeteer_Luminor';
import Coop from './Puppeteer_Coop';

async function CompareBanks(NetSalary: string): Promise<string> {
    const bankPromises = Promise.all([
        Swedbank(NetSalary),
        Luminor(NetSalary),
        Coop(NetSalary)
    ]);
    const bankResults = await bankPromises;
    const bankAmounts = bankResults.map(amount => {
        return parseFloat(amount);
    });

    const PriceLimit: string = Math.max(...bankAmounts).toString();
    console.log('Highest amount: ' + PriceLimit);
    return PriceLimit;
};

export default CompareBanks;