import * as puppeteer from 'puppeteer';
import GoogleDirectionsAPI from './Axios_GoogleDirections';
import NominatimAPI from './Axios_Nominatim';
import SqliteInsert from './Sqlite_Insert';
import { GetResultCount, GetItemsPerPage } from './Puppeteer_SearchResults';

interface BaseInfoType {
    Address: string | null ;
    Price: string | null;
    Website: string | null;
};

interface ExtraInfoType {
    Rooms: string | null;
    Size: string | null;
    Year: string | null;
    Condition: string | null;
    EnergyClass: string | null;
    Technical: string | null;
    Floors: string | null;
    Floor: string | null;
    HVAC: string | null;
    Kitchen: string | null;
    Bathroom: string | null;
    BuildingType: string | null;
    Other: string | null;
};

async function City24(TableName: string, PriceLimit: string, DealType: string): Promise<void> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: false, executablePath: MsEdgePath });
    const page = await browser.newPage();
    const StartPage = `https://www.city24.ee/real-estate-search/apartments-for-${DealType}/tallinn/price=eur-na-${PriceLimit}/rooms=1,2,3,4,5+/size=25-na/private-user/id=181-parish`;
    const ResultsDiv = '.results__sub-title';
    const AddressDiv = '.object--result .object__info .object__header .object__attributes .object__address';

    let ResultsFound: number | null = null;
    try {
        ResultsFound = await GetResultCount(page, StartPage, ResultsDiv);
    } catch (error) {
        console.error(error);
    };

    if (ResultsFound === null) {
        await browser.close();
        return console.log("City24 failed");
    };

    let ItemsOnStartPage: number | null = null;
    try {
        ItemsOnStartPage = await GetItemsPerPage(page, AddressDiv);
    } catch (error) {
        console.error(error);
    };

    if (ItemsOnStartPage === null) {
        await browser.close();
        return console.log("City24 failed");
    };

    console.log("City24 started");

    for (let PageNumber = 1; PageNumber <= Math.ceil(ResultsFound / ItemsOnStartPage); PageNumber++) {
        const ResultsPage = `https://www.city24.ee/real-estate-search/apartments-for-${DealType}/tallinn/price=eur-na-${PriceLimit}/rooms=1,2,3,4,5+/size=25-na/private-user/id=181-parish/pg=${PageNumber}`;        
        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 1000));

        let ItemsPerPage: number | null = null;
        try {
            ItemsPerPage = await GetItemsPerPage(page, AddressDiv);
        } catch (error) {
            console.error(error);
        };

        if (ItemsPerPage === null) {
            await browser.close();
            return console.log("City24 failed");
        };

        for (let i = 0; i < ItemsPerPage; i++) {
            console.log(`Page${PageNumber} ${(i + 1)}/${ItemsPerPage} out of ${ResultsFound}`);

            const { BaseInfo, ExtraInfo, lat, lon, FromWork, Area } = await GetInfo(i, page, AddressDiv).catch(console.error) as unknown as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; lat: string; lon: string; FromWork: string; Area: string; };
            SqliteInsert({
                Table: TableName,
                Area,
                Address: BaseInfo.Address,
                Rooms: ExtraInfo.Rooms,
                Size: ExtraInfo.Size,
                Price: BaseInfo.Price,
                FromWork: FromWork ?? null,
                Website: BaseInfo.Website,
                Latitude: lat,
                Longitude: lon,
                Year: ExtraInfo.Year,
                Condition: ExtraInfo.Condition,
                EnergyClass: ExtraInfo.EnergyClass,
                Technical: ExtraInfo.Technical,
                Floors: ExtraInfo.Floors,
                Floor: ExtraInfo.Floor,
                HVAC: ExtraInfo.HVAC,
                Kitchen: ExtraInfo.Kitchen,
                Bathroom: ExtraInfo.Bathroom,
                BuildingType: ExtraInfo.BuildingType,
                Other: ExtraInfo.Other
            });

            await page.goto(ResultsPage);
            await new Promise(resolve => setTimeout(resolve, 1000));
        };
    };
    await browser.close();
    console.log("City24 finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; lat: string; lon: string; FromWork: string; Area: string }> {

    const BaseInfo: BaseInfoType = await page.evaluate((i, AddressDiv) => {
        const WebsiteElement = document.querySelectorAll('.object--result .object__info .object__header .object__attributes')[i] as HTMLAnchorElement;

        let data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(',')[0].split('/')[0].replace(/-\d+$/, '').trim() ?? null;
        data.Price = document.querySelectorAll('.object--result .object__info .object__header .object__specs .object-price .object-price__main-price')[i].textContent?.replace(/\D/g, '') ?? null;
        data.Website = WebsiteElement?.href ?? null;
        return data;
    }, i, AddressDiv);

    if (BaseInfo.Website !== null) {
        await page.goto(BaseInfo.Website).catch(error => console.error(error));
        await new Promise(resolve => setTimeout(resolve, 1000));
        await page.waitForSelector('.full-specs tbody tr');
    };

    const ExtraInfo: ExtraInfoType = await page.evaluate(() => {
        let data: any = {};
        const rows = document.querySelectorAll('.full-specs tbody tr');

        rows.forEach((row) => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
                const key = cells[0].textContent?.trim();
                const tdText = cells[1].textContent?.trim();
                let value = '';
                const divs = cells[1].querySelectorAll('div');
                if (divs.length > 0) {
                    value = Array.from(divs).map(div => div.textContent?.trim()).join(', ');
                };
                value = value.replace(tdText + ', ', '');

                if (key?.match('Seisukord')) {
                    data.Condition = value ? value : null;
                } else if (key?.match('Energiamärgis')) {
                    data.EnergyClass = value ? value : null;
                } else if (key?.match('Korruseid kokku')) {
                    data.Floors = value ? parseInt(value.trim()) : null;
                } else if (key?.match('Korrus')) {
                    data.Floor = value ? parseInt(value.trim()) : null;
                } else if (key?.match('Küte') || key?.match('Ventilatsioon')) {
                    data.HVAC = value ? value : null;
                } else if (key?.match('Pliit')) {
                    data.Kitchen = value ? value : null;
                } else if (key?.match('Ehitusaasta')) {
                    data.Year = value ? parseInt(value.trim()) : null;
                } else if (key?.match('Sanitaar')) {
                    data.Bathroom = value ? value : null;
                } else if (key?.match('Materjal')) {
                    data.BuildingType = value ? value : null;
                } else if (key?.match('Tube')) {
                    data.Rooms = value ? parseInt(value.trim()) : null;
                } else if (key?.match('Üldpind')) {
                    data.Size = value ? parseInt(value.split(' ')[0].trim()) : null;
                } else if (key?.match('Side') || key?.match('Turvasüsteem')) {
                    data.Technical = value ? value : null;
                } else if (key?.match('Lisaruumid') || key?.match('Eelised') || key?.match('Parkimine') || key?.match('Lisaväärtused') || key?.match('Lift')) {
                    data.Other = value ? value : null;
                };
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
    return { BaseInfo, ExtraInfo, lat, lon, FromWork, Area} as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; lat: string; lon: string; FromWork: string; Area: string };
};

export default City24;
