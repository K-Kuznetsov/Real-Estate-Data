import * as puppeteer from 'puppeteer';
import SqliteInsert from './Sqlite_Insert';
import GetPageDetails from './Puppeteer_PageDetails';
import { GoogleDirectionsAPI, OpenStreetMapAPI } from './Axios_GeoInfo';
import { EHRBuildingSearch, EHRBuildingData } from './Axios_BuildingData';

async function City24(TableName: string, PriceLimit: string, DealType: string): Promise<any> {
    const MsEdgePath = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
    const browser = await puppeteer.launch({ headless: false, executablePath: MsEdgePath });
    const page = await browser.newPage();
    const StartPage = `https://www.city24.ee/real-estate-search/apartments-for-${DealType}/tallinn/price=eur-na-${PriceLimit}/rooms=1,2,3,4,5+/size=25-na/private-user/id=181-parish`;
    const ResultsDiv = '.results__sub-title';
    const AddressDiv = '.object--result .object__info .object__header .object__attributes .object__address';

    const { ResultsFound, ItemsPerPage } = await GetPageDetails(page, StartPage, ResultsDiv, AddressDiv).catch(console.error) as { ResultsFound: number, ItemsPerPage: number };
    if (ResultsFound === null) {
        await browser.close();
        return console.log("City24 failed");
    } else {
        console.log("City24 started");
    };

    for (let PageNumber = 1; PageNumber <= Math.ceil(ResultsFound / ItemsPerPage); PageNumber++) {
        const ResultsPage = `https://www.city24.ee/real-estate-search/apartments-for-${DealType}/tallinn/price=eur-na-${PriceLimit}/rooms=1,2,3,4,5+/size=25-na/private-user/id=181-parish/pg=${PageNumber}`;
        await page.goto(ResultsPage);
        await new Promise(resolve => setTimeout(resolve, 2000));

        for (let i = 0; i < ItemsPerPage; i++) {
            console.log(`Page${PageNumber} ${(i + 1)}/${ItemsPerPage} out of ${ResultsFound}`);

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
                    AllData.Website ?? 'City24.ee',
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
    };
    await browser.close();
    console.log("City24 finished");
};


async function GetInfo(i: number, page: puppeteer.Page, AddressDiv: string): Promise<{ AllData: any}> {

    const BaseInfo: any = await page.evaluate((i, AddressDiv) => {
        let data: any = {};
        data.Address = document.querySelectorAll(AddressDiv)[i].textContent?.split(',')[0].replace(/-\d+/g, '').replace('(otse omanikult)', '').replace('OTSE OMANIKULT', '').replace('(Broneeritud)', '').replace(/tn |mnt |pst |maantee /g, '').trim().replace(/^\./, "") + ', Tallinn' ?? null;
        data.Price = document.querySelectorAll('.object--result .object__info .object__header .object__specs .object-price .object-price__main-price')[i].textContent?.replace(/\D/g, '') ?? null;

        const WebsiteElement = document.querySelectorAll('.object--result .object__info .object__header .object__attributes')[i] as HTMLAnchorElement;
        data.Website = WebsiteElement?.href ?? null;
        return data;
    }, i, AddressDiv);

    const ExternalData: any = {};

    try {
        const GoogleResponse = await GoogleDirectionsAPI(BaseInfo.Address ?? '') ?? {};	
        ExternalData.Latitude = GoogleResponse.Latitude ?? null;
        ExternalData.Longitude = GoogleResponse.Longitude ?? null;
        ExternalData.FromWork = GoogleResponse.FromWork ?? null;
        ExternalData.Area = await OpenStreetMapAPI(ExternalData.Latitude ?? '', ExternalData.Longitude ?? '') ?? null;
        const EHRResponse = await EHRBuildingSearch(BaseInfo.Address ?? '') ?? {};
        ExternalData.EHRCode = EHRResponse.EHRCode ?? null;
        ExternalData.Year = EHRResponse.Year ?? null;
        ExternalData.Purpose = EHRResponse.Purpose ?? null;
        ExternalData.Floors = EHRResponse.Floors ?? null;
        ExternalData.EnergyClass = await EHRBuildingData(ExternalData.EHRCode ?? '') ?? null;
    } catch (error) {
        console.error(error);
    };

    if (BaseInfo.Website !== null) {
        await page.goto(BaseInfo.Website).catch(error => console.error(error));
        await new Promise(resolve => setTimeout(resolve, 2000));
        await page.waitForSelector('.full-specs tbody tr');
    };

    const ExtraInfo: any = await page.evaluate(() => {
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

export default City24;