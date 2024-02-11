import * as puppeteer from 'puppeteer';

async function Coop(NetSalary: string): Promise<string> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: true, executablePath: MsEdgePath });
    const page = await browser.newPage();
    await page.goto('https://www.cooppank.ee/kodulaen');
    await page.waitForSelector('.btn.btn-primary.agree-button.eu-cookie-compliance-default-button');
    await page.click('.btn.btn-primary.agree-button.eu-cookie-compliance-default-button');
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.waitForSelector('#edit-monthly-income');
    await page.focus('#edit-monthly-income');    
    await page.type('#edit-monthly-income', NetSalary.toString());
    await page.keyboard.press('Delete');
    await page.keyboard.press('Delete');
    await page.keyboard.press('Delete');  
    await page.keyboard.press('Enter');
    await new Promise(resolve => setTimeout(resolve, 1000));

    const LoanAmount = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('.c-form-field__label.calculation-result-title'));
        const filteredElements = elements.filter(element => element.textContent && !element.textContent.includes('Kuumakse'));

        if (filteredElements.length > 0) {
            const parallelElement = filteredElements[0].nextElementSibling;
            return parallelElement ? parallelElement.textContent?.replace(/\s/g, '') : null;
        };
        return null;
    }) as string | null;

    if (LoanAmount === null) {
        return "Coop failed";
    };

    await browser.close();
    const CoopPriceLimit: string = (parseInt(LoanAmount || '0') / 85 * 100).toFixed(0);
    console.log('Coop: ' + CoopPriceLimit);
    return CoopPriceLimit;
};

export default Coop;