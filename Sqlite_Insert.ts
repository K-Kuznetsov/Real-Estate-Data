import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./Kinnisvara.db');

function SqliteInsert(
    Table: string,
    Area: string,
    Address: string,
    Rooms: string,
    Size: string,
    Price: string,
    FromWork: string,
    Website: string,
    Latitude: string,
    Longitude: string, 
    Year: string, 
    Condition: string, 
    EnergyClass: string, 
    Technical: string, 
    Floors: string, 
    Floor: string,
    HVAC: string, 
    Kitchen: string, 
    Bathroom: string, 
    BuildingType: string, 
    Other: string, 
    EHRCode: string, 
    Purpose: string
) {
    db.run(`INSERT INTO ${Table} (
        Area,
        Address,
        Rooms,
        Size,
        Price,
        FromWork,
        Website,
        Latitude,
        Longitude,
        Year,
        Condition,
        EnergyClass,
        Technical,
        Floors,
        Floor,
        HVAC,
        Kitchen,
        Bathroom,
        BuildingType,
        Other,
        EHRCode,
        Purpose
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    WHERE NOT EXISTS (
        SELECT 1 FROM ${Table}
        WHERE Area = ? AND Address = ? AND Rooms = ? AND Size = ? AND Price = ?
    )`, [
        Area,
        Address,
        Rooms,
        Size,
        Price,
        FromWork,
        Website,
        Latitude,
        Longitude,
        Year,
        Condition,
        EnergyClass,
        Technical,
        Floors,
        Floor,
        HVAC,
        Kitchen,
        Bathroom,
        BuildingType,
        Other,
        EHRCode,
        Purpose,

        Area,
        Address,
        Rooms,
        Size,
        Price
    ]);
};

export default SqliteInsert;