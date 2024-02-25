import * as puppeteer from 'puppeteer';
import SqliteInsert from './Sqlite_Insert';
import GoogleDirectionsAPI from './Axios_GoogleDirections';
import NominatimAPI from './Axios_Nominatim';
import { EHRBuildingSearch, EHRBuildingData } from './Axios_EHR';
import { GetResultCount, GetItemsPerPage } from './Puppeteer_SearchResults';
import { BaseInfoType, ExternalDataType, ExtraInfoType } from './Interfaces';

async function KV(TableName: string, PriceLimit: string, DealType: string): Promise<any> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: false, executablePath: MsEdgePath });
    const page = await browser.newPage();
    const StartPage = `https://www.kv.ee/search?deal_type=${DealType}&company_id_check=237&county=1&parish=1061&price_max=${PriceLimit}&area_total_min=25&limit=100`;
    const ResultsDiv = '.large.stronger';
    const AddressDiv = '.description h2';

    let ResultsFound: number | null = null;
    try {
        ResultsFound = await GetResultCount(page, StartPage, ResultsDiv);
    } catch (error) {
        console.error(error);
    };

    if (ResultsFound === null) {
        await browser.close();
        return console.log("KV failed");
    };

    const ResultsPage = `https://www.kv.ee/search?deal_type=${DealType}&company_id_check=237&county=1&parish=1061&price_max=${PriceLimit}&area_total_min=25&limit=100&more=${(ResultsFound - 50)}`;
    await page.goto(ResultsPage);
    await new Promise(resolve => setTimeout(resolve, 2000));

    let ItemsPerPage: number | null = null;
    try {
        ItemsPerPage = await GetItemsPerPage(page, AddressDiv);
    } catch (error) {
        console.error(error);
    };

    if (ItemsPerPage === null) {
        await browser.close();
        return console.log("KV failed");
    };

    const PageNumber: number = Math.ceil(ResultsFound / ItemsPerPage);
    console.log('KV started');

    for (let i = 0; i < ItemsPerPage; i++) {
        console.log(`Page${PageNumber} ${(i + 1)}/${ItemsPerPage} out of ${ResultsFound}`);

        const { BaseInfo, ExtraInfo, ExternalData } = await GetInfo(i, page, AddressDiv).catch(console.error) as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExternalData: ExternalDataType };

        if (BaseInfo.Address !== null && /\d/.test(BaseInfo.Address)) {
            SqliteInsert({
                Table: TableName,
                Area: ExternalData.Area ?? null,
                Address: BaseInfo.Address ?? null,
                Rooms: ExtraInfo.Rooms ?? null,
                Size: ExtraInfo.Size ?? null,
                Price: BaseInfo.Price ?? null,
                FromWork: ExternalData.FromWork ?? null,
                Website: BaseInfo.Website ?? 'KV.ee',
                Latitude: ExternalData.Latitude ?? null,
                Longitude: ExternalData.Longitude ?? null,
                Year: ExternalData.Year ?? null,
                Condition: ExtraInfo.Condition ?? null,
                EnergyClass: ExternalData.EnergyClass ?? null,
                Technical: ExtraInfo.Technical ?? null,
                Floors: ExternalData.Floors ?? null,
                Floor: ExtraInfo.Floor ?? null,
                HVAC: ExtraInfo.HVAC ?? null,
                Kitchen: ExtraInfo.Kitchen ?? null,
                Bathroom: ExtraInfo.Bathroom ?? null,
                BuildingType: ExtraInfo.BuildingType ?? null,
                Other: ExtraInfo.Other ?? null,
                EHRCode: ExternalData.EHRCode ?? null,
                Purpose: ExternalData.Purpose ?? null
            });
        };

        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 2000));
    };
    await browser.close();
    console.log("KV finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExternalData: ExternalDataType }> {

    const BaseInfo: BaseInfoType = await page.evaluate((i, AddressDiv) => {
        const data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(",")[2]?.replace(/-\d+/g, '').replace('(otse omanikult)', '').replace('(Broneeritud)', '').replace(/^\./, "").trim() + ', Tallinn' || null;

        let priceElement = document.querySelectorAll('.price')[0];
        data.Price = priceElement?.textContent?.split('  ')[0].replace(/\D/g, '') || null;

        if (data.Price === null || data.Price === undefined || data.Price === '') {
            priceElement = document.querySelectorAll('.price')[i + 1];
            data.Price = priceElement?.textContent?.split('  ')[0].replace(/\D/g, '') || null;
        } else {
            priceElement = document.querySelectorAll('.price')[i];
            data.Price = priceElement?.textContent?.split('  ')[0].replace(/\D/g, '') || null;
        };

        const websiteElement = document.querySelectorAll('.description h2 a:not(.object-promoted)')[i] as HTMLAnchorElement;
        data.Website = websiteElement?.href ?? null;

        return data;
    }, i, AddressDiv);

    const ExternalData: ExternalDataType = {
        Latitude: null,
        Longitude: null,
        FromWork: null,
        Area: null,
        EHRCode: null,
        Year: null,
        Purpose: null,
        Floors: null,
        EnergyClass: null
    };

    try {
        const GoogleResponse = await GoogleDirectionsAPI(BaseInfo.Address ?? '');
        ExternalData.Latitude = GoogleResponse.Latitude ?? null;
        ExternalData.Longitude = GoogleResponse.Longitude ?? null;
        ExternalData.FromWork = GoogleResponse.FromWork ?? null;
        ExternalData.Area = ExternalData.Latitude && ExternalData.Longitude ? await NominatimAPI(ExternalData.Latitude, ExternalData.Longitude) : null;
        const EHRResponse = await EHRBuildingSearch(BaseInfo.Address ?? '');
        ExternalData.EHRCode = EHRResponse.EHRCode ?? null;
        ExternalData.Year = EHRResponse.Year ?? null;
        ExternalData.Purpose = EHRResponse.Purpose ?? null;
        ExternalData.Floors = EHRResponse.Floors ?? null;
        ExternalData.EnergyClass = await EHRBuildingData(ExternalData.EHRCode ?? '');
    } catch (error) {
        console.error(error);
    };

    if (BaseInfo.Website) {
        await page.goto(BaseInfo.Website);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.waitForSelector('.meta-table .table-lined tr');
    };

    const ExtraInfo = await page.evaluate(() => {
        let data: any = {};
        const rows = document.querySelectorAll('.meta-table .table-lined tr');
        for (const row of rows) {
            const th = row.querySelector('th');
            const td = row.querySelector('td');

            if (th && th.textContent) {
                if (th.textContent.match('Korrus/Korruseid')) {
                    data.Floor = parseInt(td?.textContent?.split('/')[0].trim() || '') || null;
                } else if (th.textContent.match('Seisukord')) {
                    data.Condition = td?.textContent?.trim() || null;
                } else if (th.textContent.match('Üldpind')) {
                    data.Size = parseInt(td?.textContent?.split(' ')[0].trim() || '') || null;
                } else if (th.textContent.match('Tube')) {
                    data.Rooms = parseInt(td?.textContent?.trim() || '') || null;
                };
            };
        };

        const BaseText = (document.querySelector('#object-extra-info .description p') as HTMLParagraphElement)?.innerText || '';
        const lines = BaseText.split('\n');

        lines.forEach((line) => {
            if (line.includes('Köök:')) {
                data.Kitchen = line.replace('Köök: ', '').trim();
            } else if (line.includes('Sanruum:')) {
                data.Bathroom = line.replace('Sanruum: ', '').trim();
            } else if (line.includes('Küte ja ventilatsioon:')) {
                data.HVAC = line.replace('Küte ja ventilatsioon: ', '').trim();
            } else if (line.includes('Side ja turvalisus:')) {
                data.Technical = line.replace('Side ja turvalisus: ', '').trim();
            } else if (line.includes('Lisainfo:')) {
                data.Other = line.replace('Lisainfo: ', '').trim();
            } else if (!data.BuildingType && line.trim().length > 0) {
                data.BuildingType = line.trim();
            };
        });

        return data;
    });

    return { BaseInfo, ExtraInfo, ExternalData } as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExternalData: ExternalDataType };
};

export default KV;
