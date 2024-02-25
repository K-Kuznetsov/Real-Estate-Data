import * as puppeteer from 'puppeteer';

async function GetPageDetails(page: puppeteer.Page, StartPage: string, ResultsDiv: string, AddressDiv: string): Promise<{ ResultsFound: number, ItemsPerPage: number }> {
    await page.goto(StartPage);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await page.click('#onetrust-accept-btn-handler').catch(() => console.log('No cookies'));

    const ResultsFound = await page.evaluate((resultsDiv: string) => {
        return parseFloat(document.querySelector(resultsDiv)?.textContent?.replace(/\D/g, '') ?? '');
    }, ResultsDiv);

    let ItemsPerPage = await page.$$eval(AddressDiv, (elements: Element[]) => elements.length);

    while (ItemsPerPage === 0) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        ItemsPerPage = await page.$$eval(AddressDiv, (elements: Element[]) => elements.length);
    };

    return { ResultsFound, ItemsPerPage };
};

export default GetPageDetails;