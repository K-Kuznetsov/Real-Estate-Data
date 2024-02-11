import * as puppeteer from 'puppeteer';
import GoogleDirectionsAPI from './Axios_GoogleDirections';
import NominatimAPI from './Axios_Nominatim';
import SqliteInsert from './Sqlite_Insert';
import { GetResultCount, GetItemsPerPage } from './Puppeteer_SearchResults';

interface BaseInfoType {
    Address: string;
    Price: string;
    Website: string | 'kv.ee';
};

interface ExtraInfoType {
    Floor: number;
    Floors: number;
    Year: number;
    EnergyClass: string;
    Condition: string;
    Size: number;
    Rooms: number;
};

interface ExtraInfoType2 {
    Kitchen: string;
    Bathroom: string;
    HVAC: string;
    Technical: string;
    Other: string;
    BuildingType: string;
};

async function KV(TableName: string, PriceLimit: string, DealType: string): Promise<void> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: false, executablePath: MsEdgePath });
    const page = await browser.newPage();
    const StartPage =  'https://www.kv.ee/search?deal_type=' + DealType + '&company_id_check=237&county=1&parish=1061&price_max=' + PriceLimit + '&area_total_min=25&limit=100';
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

    const ResultsPage = 'https://www.kv.ee/search?deal_type=' + DealType + '&company_id_check=237&county=1&parish=1061&price_max=' + PriceLimit + '&area_total_min=25&limit=100&more=' + (ResultsFound - 50);

    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.goto(ResultsPage);

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
        console.log('Page' + PageNumber + ' ' + (i + 1) + '/' + ItemsPerPage + ' out of ' + ResultsFound);

        const { BaseInfo, ExtraInfo, ExtraInfo2, lat, lon, FromWork, Area } = await GetInfo(i, page, AddressDiv).catch(console.error) as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; lat: number; lon: number; FromWork: string; Area: string; };
        SqliteInsert({
            Table: TableName,
            Area,
            Address: BaseInfo.Address,
            Rooms: ExtraInfo.Rooms,
            Size: ExtraInfo.Size,
            Price: BaseInfo.Price,
            FromWork: parseFloat(FromWork) ?? null,
            Website: BaseInfo.Website ?? 'KV.ee',
            Latitude: lat,
            Longitude: lon,
            Year: ExtraInfo.Year ?? 0,
            Condition: ExtraInfo.Condition ?? '',
            EnergyClass: ExtraInfo.EnergyClass ?? '',
            Technical: ExtraInfo2.Technical ?? '',
            Floors: ExtraInfo.Floors ?? 0,
            Floor: ExtraInfo.Floor ?? 0,
            HVAC: ExtraInfo2.HVAC ?? '',
            Kitchen: ExtraInfo2.Kitchen ?? '',
            Bathroom: ExtraInfo2.Bathroom ?? '',
            BuildingType: ExtraInfo2.BuildingType ?? '',
            Other: ExtraInfo2.Other ?? ''
        });

        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 5000));
    };
    await browser.close();
    console.log("KV finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; lat: number; lon: number; FromWork: string; Area: string }> {

    const BaseInfo: BaseInfoType = await page.evaluate((i, AddressDiv) => {
        const data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(",")[2]?.split('/')[0]?.replace(/-\d+$/, '')?.trim() || null;
        data.Price = document.querySelectorAll('.price')[i].textContent?.split('  ')[0].replace(' €', '').replace(' ', '').replace(/\D/g, '').trim() || null;
        const websiteElement = document.querySelectorAll('.description h2 a:not(.object-promoted)')[i] as HTMLAnchorElement;
        data.Website = websiteElement?.href ?? 'KV.ee';
        return data;
    }, i, AddressDiv);

    await page.goto(BaseInfo.Website);
    await page.waitForSelector('.meta-table .table-lined tr');

    const ExtraInfo = await page.evaluate(() => {
        let data: any = {};
        const rows = document.querySelectorAll('.meta-table .table-lined tr');
        for (const row of rows) {
            const th = row.querySelector('th');
            const td = row.querySelector('td');

            if (th && th.textContent && th.textContent.match('Korrus/Korruseid')) {
                data.Floor = parseInt(td?.textContent?.split('/')[0].trim() || '0') || null;
                data.Floors = parseInt(td?.textContent?.split('/')[1].trim() || '0') || null;
            } else if (th && th.textContent && th.textContent.match('Ehitusaasta')) {
                data.Year = parseInt(td?.textContent?.trim() || '0') || null;
            } else if (th && th.textContent && th.textContent.match('Energiamärgis')) {
                data.EnergyClass = td?.textContent?.trim() || null;
            } else if (th && th.textContent && th.textContent.match('Seisukord')) {
                data.Condition = td?.textContent?.trim() || null;
            } else if (th && th.textContent && th.textContent.match('Üldpind')) {
                data.Size = parseInt(td?.textContent?.split(' ')[0].trim() || '0') || null;
            } else if (th && th.textContent && th.textContent.match('Tube')) {
                data.Rooms = parseInt(td?.textContent?.trim() || '0') || null;
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

    const GoogleMapsAddress = BaseInfo.Address ? BaseInfo.Address.replace('(otse omanikult)', '').replace(/[ÕÖÜÄ]/g, match => {
        const map: { [key: string]: string } = { 'Õ': 'O', 'Ö': 'O', 'Ü': 'U', 'Ä': 'A' };
        return map[match];
    }).replace(/[õöüä]/g, match => {
        const map: { [key: string]: string } = { 'õ': 'o', 'ö': 'o', 'ü': 'u', 'ä': 'a' };
        return map[match];
    }).trim() + ', Tallinn' : null;

    let lat: number | null = null;
    try {
        lat = await GoogleDirectionsAPI(GoogleMapsAddress ?? '').then(response => response.lat);
    } catch (error) {
        console.error(error);
    };

    let lon: number | null = null;
    try {
        lon = await GoogleDirectionsAPI(GoogleMapsAddress ?? '').then(response => response.lon);
    } catch (error) {
        console.error(error);
    };

    let FromWork: string | null = null;
    try {
        FromWork = await GoogleDirectionsAPI(GoogleMapsAddress ?? '').then(response => response.FromWork);
    } catch (error) {
        console.error(error);
    };

    let Area: string | null = null;
    try {
        Area = await NominatimAPI(lat ?? 0, lon ?? 0).then(response => response);
    } catch (error) {
        console.error(error);
    };

    return { BaseInfo, ExtraInfo, ExtraInfo2, lat: lat ?? 0, lon: lon ?? 0, FromWork: FromWork ?? '0', Area: Area ?? '' } as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; lat: number; lon: number; FromWork: string; Area: string };
};

export default KV;
