import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./Kinnisvara.db');

interface SqliteInsertParams {
    Table: string;
    Area: string;
    Address: string;
    Rooms: number;
    Size: number;
    Price: string;
    FromWork: number;
    Website: string;
    Latitude: number;
    Longitude: number;
    Year: number;
    Condition: string;
    EnergyClass: string;
    Technical: string;
    Floors: number;
    Floor: number;
    HVAC: string;
    Kitchen: string;
    Bathroom: string;
    BuildingType: string;
    Other: string;
};

function SqliteInsert({
    Table, Area, Address, Rooms, Size, Price, FromWork, Website,
    Latitude, Longitude, Year, Condition, EnergyClass, Technical, Floors, Floor,
    HVAC, Kitchen, Bathroom, BuildingType, Other
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
        Other
    ) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
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

        Area,
        Address,
        Rooms,
        Size,
        Price
    ]);
};

export default SqliteInsert;