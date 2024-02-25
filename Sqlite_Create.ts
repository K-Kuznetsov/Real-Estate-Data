import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./Kinnisvara.db');

async function SqliteCreate(Table: string): Promise<any> {
    db.run(`DROP TABLE IF EXISTS ${Table}`);
    db.run(`CREATE TABLE IF NOT EXISTS ${Table} (
        ID INTEGER PRIMARY KEY AUTOINCREMENT, 
        Area text, 
        Address text, 
        EHRCode string,
        Year integer,
        EnergyClass text, 
        Rooms integer, 
        Floor integer, 
        Floors integer, 
        Size integer, 
        Price integer,
        Latitude real, 
        Longitude real, 
        FromWork real,
        Purpose string,
        Website text, 
        BuildingType text,         
        Condition text,         
        HVAC text, 
        Kitchen text, 
        Bathroom text,         
        Technical text,
        Other text        
        )`
    );
};

export default SqliteCreate;