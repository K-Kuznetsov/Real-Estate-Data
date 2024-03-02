import * as puppeteer from 'puppeteer';
import SqliteInsert from './Sqlite_Insert';
import GetPageDetails from './Puppeteer_PageDetails';
import { GoogleDirectionsAPI, OpenStreetMapAPI } from './Axios_GeoInfo';
import { EHRBuildingSearch, EHRBuildingData } from './Axios_BuildingData';

async function KV(TableName: string, PriceLimit: string, DealType: string): Promise<any> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: false, executablePath: MsEdgePath });
    const page = await browser.newPage();
    const StartPage = `https://www.kv.ee/search?deal_type=${DealType}&company_id_check=237&county=1&parish=1061&price_max=${PriceLimit}&area_total_min=25&limit=100`;
    const ResultsDiv = '.large.stronger';
    const AddressDiv = '.description h2';

    const { ResultsFound} = await GetPageDetails(page, StartPage, ResultsDiv, AddressDiv).catch(console.error) as { ResultsFound: number, ItemsPerPage: number };
    if (ResultsFound === null) {
        await browser.close();
        return console.log("KV failed");
    } else {
        console.log('KV started');
    };    

    const ResultsPage = `https://www.kv.ee/search?deal_type=${DealType}&company_id_check=237&county=1&parish=1061&price_max=${PriceLimit}&area_total_min=25&limit=100&more=${(ResultsFound - 50)}`;
    await page.goto(ResultsPage);
    await new Promise(resolve => setTimeout(resolve, 2000));    

    for (let i = 0; i < ResultsFound; i++) {
        console.log(`Page1 ${(i + 1)}/${ResultsFound} out of ${ResultsFound}`);

        const AllData = await GetInfo(i, page, AddressDiv).catch(console.error) as any;

        if (AllData.Address !== null && /\d/.test(AllData.Address)) {
            SqliteInsert(
                TableName,
                AllData.Area ?? null,
                AllData.Address ?? null,
                AllData.Rooms ?? null,
                AllData.Size ?? null,
                AllData.Price ?? null,
                AllData.FromWork ?? null,
                AllData.Website ?? 'KV.ee',
                AllData.Latitude ?? null,
                AllData.Longitude ?? null,
                AllData.Year ?? null,
                AllData.Condition ?? null,
                AllData.EnergyClass ?? null,
                AllData.Technical ?? null,
                AllData.Floors ?? null,
                AllData.Floor ?? null,
                AllData.HVAC ?? null,
                AllData.Kitchen ?? null,
                AllData.Bathroom ?? null,
                AllData.BuildingType ?? null,
                AllData.Other ?? null,
                AllData.EHRCode ?? null,
                AllData.Purpose ?? null
            );
        };

        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 2000));
    };
    await browser.close();
    console.log("KV finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ AllData: any }> {

    const BaseInfo: any = await page.evaluate((i, AddressDiv) => {
        const data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(",")[2]?.replace(/-\d+/g, '').replace('(otse omanikult)', '').replace('OTSE OMANIKULT', '').replace('(Broneeritud)', '').replace(/tn |mnt |pst |maantee /g, '').trim().replace(/^\./, "") + ', Tallinn' || null;

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

    const ExternalData: any = {};

    try {
        const GoogleResponse = await GoogleDirectionsAPI(BaseInfo.Address ?? '') ?? {} as { Latitude: number, Longitude: number, FromWork: number };
        ExternalData.Latitude = GoogleResponse.Latitude ?? null;
        ExternalData.Longitude = GoogleResponse.Longitude ?? null;
        ExternalData.FromWork = GoogleResponse.FromWork ?? null;
        ExternalData.Area = await OpenStreetMapAPI(ExternalData.Latitude ?? '', ExternalData.Longitude ?? '') ?? null;
        const EHRResponse = await EHRBuildingSearch(BaseInfo.Address ?? '') ?? {} as { EHRCode: string, Year: number, Purpose: string, Floors: number };
        ExternalData.EHRCode = EHRResponse.EHRCode ?? null;
        ExternalData.Year = EHRResponse.Year ?? null;
        ExternalData.Purpose = EHRResponse.Purpose ?? null;
        ExternalData.Floors = EHRResponse.Floors ?? null;
        ExternalData.EnergyClass = await EHRBuildingData(ExternalData.EHRCode ?? '') ?? null;
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

    const AllData: any = {
        Area: ExternalData.Area ?? null,
        Address: BaseInfo.Address ?? null,
        Rooms: ExtraInfo.Rooms ?? null,
        Size: ExtraInfo.Size ?? null,
        Price: BaseInfo.Price ?? null,
        FromWork: ExternalData.FromWork ?? null,
        Website: BaseInfo.Website ?? null,
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
    };

    return AllData;
};

export default KV;
