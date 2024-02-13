import * as puppeteer from 'puppeteer';

async function Luminor(NetSalary: string): Promise<string> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: true, executablePath: MsEdgePath });
    const page = await browser.newPage();
    await page.goto('https://luminor.ee/era/kodulaen?t=maksimaalne-laenusumma');
    await page.waitForSelector('#onetrust-accept-btn-handler');
    await page.click('#onetrust-accept-btn-handler');
    await page.waitForSelector('#mortgage_loan_monthly_income_after_tax');
    await page.focus('#mortgage_loan_monthly_income_after_tax');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.keyboard.press('Backspace');
    await page.type('#mortgage_loan_monthly_income_after_tax', NetSalary.toString());
    await new Promise(resolve => setTimeout(resolve, 1000));

    let LoanAmount: string | null = null;
    try {
        LoanAmount = await page.evaluate(() => {
            return document.querySelector('.component-money')?.textContent?.replace(/\D/g, '') ?? null;
        });
    } catch (error) {
        console.error(error);
    };

    if (LoanAmount === null) {
        return "Luminor failed";
    };

    await browser.close();
    const LuminorPriceLimit: string = (parseInt(LoanAmount) / 85 * 100).toFixed(0);
    console.log('Luminor: ' + LuminorPriceLimit);
    return LuminorPriceLimit;    
};

export default Luminor;
