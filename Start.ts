import GrossToNet from './Node_GetNetSalary';
import CompareBanks from './Node_CompareBanks';
import SqliteCreate from './Sqlite_Create';
import KV from './Puppeteer_KV';
import City24 from './Puppeteer_City24';

async function StartProgram(): Promise<any> {
    const NetSalary: string = GrossToNet() || '';
    const PriceLimit: string = await CompareBanks(NetSalary).catch(error => console.error(error)) || '';

    SqliteCreate('Buy');
    await City24('Buy', PriceLimit, 'sale').catch(error => console.error(error));
    await KV('Buy', PriceLimit, '1').catch(error => console.error(error));

    SqliteCreate('Rent');
    await City24('Rent', '600', 'rent').catch(error => console.error(error));
    await KV('Rent', '600', '2').catch(error => console.error(error));    
};

StartProgram();
