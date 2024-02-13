import * as puppeteer from 'puppeteer';

async function Swedbank(NetSalary: string): Promise<string> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: true, executablePath: MsEdgePath });
    const page = await browser.newPage();
    await page.goto('https://www.swedbank.ee/private/credit/loans/home?language=EST');
    await page.click('.ui-cookie-consent__accept-button');
    await page.waitForSelector('#total-income');
    await page.type('#total-income', NetSalary.toString());
    await new Promise(resolve => setTimeout(resolve, 1000));

    let LoanAmount: string | null = null;
    try {
        LoanAmount = await page.evaluate(() => {
            return document.querySelector('#max-amount')?.textContent?.replace(/\D/g, '') ?? null;
        });
    } catch (error) {
        console.error(error);
    };

    if (LoanAmount === null) {
        return "Swedbank failed";
    };

    await browser.close();
    const SwedbankPriceLimit: string = (parseInt(LoanAmount) / 85 * 100).toFixed(0);
    console.log('Swedbank: ' + SwedbankPriceLimit);
    return SwedbankPriceLimit;    
};

export default Swedbank;
