import sqlite3 from 'sqlite3';
const db = new sqlite3.Database('./Kinnisvara.db');

async function SqliteCreate(Table: string): Promise<void> {
    db.run(`DROP TABLE IF EXISTS ${Table}`);
    db.run(`CREATE TABLE IF NOT EXISTS ${Table} (
        ID INTEGER PRIMARY KEY AUTOINCREMENT, 
        Area text, 
        Address text, 
        Rooms integer, 
        Size integer, 
        Price integer,
        Latitude real, 
        Longitude real, 
        FromWork real, 
        Website text, 
        BuildingType text,
        Year integer, 
        Condition text, 
        EnergyClass text, 
        Floors integer, 
        Floor integer, 
        HVAC text, 
        Kitchen text, 
        Bathroom text,         
        Technical text,
        Other text
        )`
    );
};

export default SqliteCreate;