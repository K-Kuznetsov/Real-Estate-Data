import * as puppeteer from 'puppeteer';
import GoogleDirectionsAPI from './Axios_GoogleDirections';
import NominatimAPI from './Axios_Nominatim';
import { EHRBuildingSearch, EHRBuildingData } from './Axios_EHR';
import SqliteInsert from './Sqlite_Insert';
import { GetResultCount, GetItemsPerPage } from './Puppeteer_SearchResults';

interface BaseInfoType {
    Address: string | null;
    Price: string | null;
    Website: string | null;
};

interface ExtraInfoType {
    Floor: string | null;
    Condition: string | null;
    Size: string | null;
    Rooms: string | null;
};

interface ExtraInfoType2 {
    Kitchen: string | null;
    Bathroom: string | null;
    HVAC: string | null;
    Technical: string | null;
    Other: string | null;
    BuildingType: string | null;
};

async function KV(TableName: string, PriceLimit: string, DealType: string): Promise<void> {
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

        const { BaseInfo, ExtraInfo, ExtraInfo2, Latitude, Longitude, FromWork, Area, Year, Purpose, Floors, EnergyClass, EHRCode } = await GetInfo(i, page, AddressDiv).catch(console.error) as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; Latitude: string; Longitude: string; FromWork: string; Area: string; Year: string; Purpose: string; Floors: string; EnergyClass: string; EHRCode: string};
        SqliteInsert({
            Table: TableName,
            Area : Area ?? null,
            Address: BaseInfo.Address ?? null,
            Rooms: ExtraInfo.Rooms ?? null,
            Size: ExtraInfo.Size ?? null,
            Price: BaseInfo.Price ?? null,
            FromWork: FromWork ?? null,
            Website: BaseInfo.Website ?? 'KV.ee',
            Latitude: Latitude ?? null,
            Longitude: Longitude ?? null,
            Year: Year ?? null,
            Condition: ExtraInfo.Condition ?? null,
            EnergyClass: EnergyClass ?? null,
            Technical: ExtraInfo2.Technical ?? null,
            Floors: Floors ?? null,
            Floor: ExtraInfo.Floor ?? null,
            HVAC: ExtraInfo2.HVAC ?? null,
            Kitchen: ExtraInfo2.Kitchen ?? null,
            Bathroom: ExtraInfo2.Bathroom ?? null,
            BuildingType: ExtraInfo2.BuildingType ?? null,
            Other: ExtraInfo2.Other ?? null,
            EHRCode: EHRCode ?? null,
            Purpose: Purpose ?? null
        });

        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 2000));
    };
    await browser.close();
    console.log("KV finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; Latitude: string; Longitude: string; FromWork: string; Area: string }> {

    const BaseInfo: BaseInfoType = await page.evaluate((i, AddressDiv) => {
        const data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(",")[2]?.split('/')[0]?.replace(/-\d+$/, '')?.trim() || null;

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


    if (BaseInfo.Website) {
        await page.goto(BaseInfo.Website);
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.waitForSelector('.meta-table .table-lined tr');
    }

    const ExtraInfo = await page.evaluate(() => {
        let data: any = {};
        const rows = document.querySelectorAll('.meta-table .table-lined tr');
        for (const row of rows) {
            const th = row.querySelector('th');
            const td = row.querySelector('td');

            if (th && th.textContent && th.textContent.match('Korrus/Korruseid')) {
                data.Floor = parseInt(td?.textContent?.split('/')[0].trim() || '') || null;
            } else if (th && th.textContent && th.textContent.match('Seisukord')) {
                data.Condition = td?.textContent?.trim() || null;
            } else if (th && th.textContent && th.textContent.match('Üldpind')) {
                data.Size = parseInt(td?.textContent?.split(' ')[0].trim() || '') || null;
            } else if (th && th.textContent && th.textContent.match('Tube')) {
                data.Rooms = parseInt(td?.textContent?.trim() || '') || null;
            };
        };
        return data;
    });

    const ExtraInfo2 = await page.evaluate(() => {
        let data: any = {};
        const BaseText = (document.querySelector('#object-extra-info .description p') as HTMLParagraphElement)?.innerText! || '';
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

    const GoogleMapsAddress = BaseInfo.Address ? BaseInfo.Address.replace('(otse omanikult)', '').replace('(broneeritud)', '').trim() + ', Tallinn' : null;

    let Latitude: string | null = null;
    let Longitude: string | null = null;
    let FromWork: string | null = null;
    try {
        const Response = await GoogleDirectionsAPI(GoogleMapsAddress ?? '');
        Latitude = Response.Latitude ?? '';
        Longitude = Response.Longitude ?? '';
        FromWork = Response.FromWork ?? '';
    } catch (error) {
        console.error(error);
    };

    let Area: string | null = null;
    try {
        Area = await NominatimAPI(Latitude ?? '', Longitude ?? '').then(Response => Response);
    } catch (error) {
        console.error(error);
    };

    let EHRCode: string | null = null;
    let Year: string | null = null;
    let Purpose: string | null = null;
    let Floors: string | null = null;
    try {
        const Response = await EHRBuildingSearch(GoogleMapsAddress ?? '').then(Response => Response);
        EHRCode = Response.EHRCode ?? null;
        Year = Response.Year ?? null;
        Purpose = Response.Purpose ?? null;
        Floors = Response.Floors ?? null;
    } catch (error) {
        console.error(error);
    };
    
    let EnergyClass: string | null = null;
    try {
        EnergyClass = await EHRBuildingData(EHRCode ?? '').then(Response => Response);
    } catch (error) {
        console.error(error);
    };

    console.log(GoogleMapsAddress);

    return { BaseInfo, ExtraInfo, ExtraInfo2, Latitude, Longitude, FromWork, Area, Year, Purpose, Floors, EnergyClass, EHRCode } as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; Latitude: string; Longitude: string; FromWork: string; Area: string; Year: string; Purpose: string; Floors: string; EnergyClass: string; EHRCode: string};
};

export default KV;
