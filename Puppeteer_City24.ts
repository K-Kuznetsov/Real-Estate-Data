import * as puppeteer from 'puppeteer';
import SqliteInsert from './Sqlite_Insert';
import GoogleDirectionsAPI from './Axios_GoogleDirections';
import NominatimAPI from './Axios_Nominatim';
import { EHRBuildingSearch, EHRBuildingData } from './Axios_EHR';
import { GetResultCount, GetItemsPerPage } from './Puppeteer_SearchResults';
import { BaseInfoType, ExternalDataType, ExtraInfoType } from './Interfaces';

async function City24(TableName: string, PriceLimit: string, DealType: string): Promise<any> {
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
        await new Promise(resolve => setTimeout(resolve, 2000));

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

            const { BaseInfo, ExtraInfo, ExternalData } = await GetInfo(i, page, AddressDiv).catch(console.error) as unknown as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExternalData: ExternalDataType; };

            if (BaseInfo.Address !== null && /\d/.test(BaseInfo.Address)) {
                SqliteInsert({
                    Table: TableName,
                    Area: ExternalData.Area ?? null,
                    Address: BaseInfo.Address ?? null,
                    Rooms: ExtraInfo.Rooms ?? null,
                    Size: ExtraInfo.Size ?? null,
                    Price: BaseInfo.Price ?? null,
                    FromWork: ExternalData.FromWork ?? null,
                    Website: BaseInfo.Website ?? 'City24.ee',
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
    };
    await browser.close();
    console.log("City24 finished");
};

async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExternalData: ExternalDataType }> {

    const BaseInfo: BaseInfoType = await page.evaluate((i, AddressDiv) => {
        const WebsiteElement = document.querySelectorAll('.object--result .object__info .object__header .object__attributes')[i] as HTMLAnchorElement;

        let data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(',')[0].replace(/-\d+/g, '').replace('(otse omanikult)', '').replace('(Broneeritud)', '').replace(/^\./, "").trim() + ', Tallinn' ?? null;
        data.Price = document.querySelectorAll('.object--result .object__info .object__header .object__specs .object-price .object-price__main-price')[i].textContent?.replace(/\D/g, '') ?? null;
        data.Website = WebsiteElement?.href ?? null;
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

    if (BaseInfo.Website !== null) {
        await page.goto(BaseInfo.Website).catch(error => console.error(error));
        await new Promise(resolve => setTimeout(resolve, 2000));
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
                } else if (key?.match('Korrus')) {
                    data.Floor = value ? parseInt(value.trim()) : null;
                } else if (key?.match('Küte') || key?.match('Ventilatsioon')) {
                    data.HVAC = value ? value : null;
                } else if (key?.match('Pliit')) {
                    data.Kitchen = value ? value : null;
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

    return { BaseInfo, ExtraInfo, ExternalData } as { BaseInfo: BaseInfoType; ExtraInfo: ExtraInfoType; ExternalData: ExternalDataType };
};

export default City24;