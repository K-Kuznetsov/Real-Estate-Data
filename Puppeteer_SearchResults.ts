import * as puppeteer from 'puppeteer';

async function GetResultCount(page: puppeteer.Page, startPage: string, resultsDiv: string): Promise<number> {
    await page.goto(startPage);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.click('#onetrust-accept-btn-handler').catch(() => console.log('No cookies'));

    const resultsFound = await page.evaluate((resultsDiv: string) => {
        return parseFloat(document.querySelector(resultsDiv)?.textContent?.replace(/\D/g, '') ?? '');
    }, resultsDiv);

    return resultsFound;
};

async function GetItemsPerPage(page: puppeteer.Page, addressDiv: string): Promise<number> {
    let itemsPerPage = await page.$$eval(addressDiv, (elements: Element[]) => elements.length);

    while (itemsPerPage === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        itemsPerPage = await page.$$eval(addressDiv, (elements: Element[]) => elements.length);
    };

    return itemsPerPage;
};

export { GetResultCount, GetItemsPerPage };