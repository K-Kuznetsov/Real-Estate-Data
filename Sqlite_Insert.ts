import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./Kinnisvara.db');

interface SqliteInsertParams {
    Table: string | null;
    Area: string | null;
    Address: string | null;
    Rooms: string | null;
    Size: string | null;
    Price: string | null;
    FromWork: string | null;
    Website: string | null;
    Latitude: string | null;
    Longitude: string | null;
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
    EHRCode: string | null;
    Purpose: string | null;
};

function SqliteInsert({
    Table, Area, Address, Rooms, Size, Price, FromWork, Website, Latitude,
    Longitude, Year, Condition, EnergyClass, Technical, Floors, Floor,
    HVAC, Kitchen, Bathroom, BuildingType, Other, EHRCode, Purpose
}: SqliteInsertParams): void {
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
