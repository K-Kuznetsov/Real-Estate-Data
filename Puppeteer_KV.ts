import * as puppeteer from 'puppeteer';
import GoogleDirectionsAPI from './Axios_GoogleDirections';
import NominatimAPI from './Axios_Nominatim';
import SqliteInsert from './Sqlite_Insert';
import { GetResultCount, GetItemsPerPage } from './Puppeteer_SearchResults';

interface BaseInfoType {
    Address: string | null;
    Price: string | null;
    Website: string | null;
};

interface ExtraInfoType {
    Floor: string | null;
    Floors: string | null;
    Year: string | null;
    EnergyClass: string | null;
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

        const { BaseInfo, ExtraInfo, ExtraInfo2, lat, lon, FromWork, Area } = await GetInfo(i, page, AddressDiv).catch(console.error) as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; lat: string; lon: string; FromWork: string; Area: string; };
        SqliteInsert({
            Table: TableName,
            Area,
            Address: BaseInfo.Address,
            Rooms: ExtraInfo.Rooms,
            Size: ExtraInfo.Size,
            Price: BaseInfo.Price,
            FromWork: FromWork,
            Website: BaseInfo.Website ?? 'KV.ee',
            Latitude: lat,
            Longitude: lon,
            Year: ExtraInfo.Year,
            Condition: ExtraInfo.Condition,
            EnergyClass: ExtraInfo.EnergyClass,
            Technical: ExtraInfo2.Technical,
            Floors: ExtraInfo.Floors,
            Floor: ExtraInfo.Floor,
            HVAC: ExtraInfo2.HVAC,
            Kitchen: ExtraInfo2.Kitchen,
            Bathroom: ExtraInfo2.Bathroom,
            BuildingType: ExtraInfo2.BuildingType,
            Other: ExtraInfo2.Other
        });

        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 5000));
    };
    await browser.close();
    console.log("KV finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; lat: string; lon: string; FromWork: string; Area: string }> {

    const BaseInfo: BaseInfoType = await page.evaluate((i, AddressDiv) => {
        const data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(",")[2]?.split('/')[0]?.replace(/-\d+$/, '')?.trim() || null;
    
        let priceElement = document.querySelectorAll('.price')[0];
        data.Price = priceElement?.textContent?.split('  ')[0].replace(' €', '').replace(' ', '').replace(/\D/g, '').trim() || null;
    
        if (data.Price === null || data.Price === undefined || data.Price === '') {
            priceElement = document.querySelectorAll('.price')[i + 1];
            data.Price = priceElement?.textContent?.split('  ')[0].replace(' €', '').replace(' ', '').replace(/\D/g, '').trim() || null;
        } else {
            priceElement = document.querySelectorAll('.price')[i];
            data.Price = priceElement?.textContent?.split('  ')[0].replace(' €', '').replace(' ', '').replace(/\D/g, '').trim() || null;
        };
    
        const websiteElement = document.querySelectorAll('.description h2 a:not(.object-promoted)')[i] as HTMLAnchorElement;
        data.Website = websiteElement?.href ?? null;
    
        return data;
    }, i, AddressDiv);
    

    if (BaseInfo.Website) {
        await page.goto(BaseInfo.Website);
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
                data.Floors = parseInt(td?.textContent?.split('/')[1].trim() || '') || null;
            } else if (th && th.textContent && th.textContent.match('Ehitusaasta')) {
                data.Year = parseInt(td?.textContent?.trim() || '') || null;
            } else if (th && th.textContent && th.textContent.match('Energiamärgis')) {
                data.EnergyClass = td?.textContent?.trim() || null;
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

    const GoogleMapsAddress = BaseInfo.Address ? BaseInfo.Address.replace('(otse omanikult)', '').replace(/[ÕÖÜÄ]/g, match => {
        const map: { [key: string]: string } = { 'Õ': 'O', 'Ö': 'O', 'Ü': 'U', 'Ä': 'A' };
        return map[match];
    }).replace(/[õöüä]/g, match => {
        const map: { [key: string]: string } = { 'õ': 'o', 'ö': 'o', 'ü': 'u', 'ä': 'a' };
        return map[match];
    }).trim() + ', Tallinn' : null;

    let lat: string | null = null;
    try {
        lat = await GoogleDirectionsAPI(GoogleMapsAddress ?? '').then(response => response.lat);
    } catch (error) {
        console.error(error);
    };

    let lon: string | null = null;
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
        Area = await NominatimAPI(lat ?? '', lon ?? '').then(response => response);
    } catch (error) {
        console.error(error);
    };

    return { BaseInfo, ExtraInfo, ExtraInfo2, lat, lon, FromWork, Area} as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExtraInfo2: ExtraInfoType2; lat: string; lon: string; FromWork: string; Area: string };
};

export default KV;
