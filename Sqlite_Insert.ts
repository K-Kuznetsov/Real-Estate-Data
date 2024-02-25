import sqlite3 from 'sqlite3';
import { SqliteInsertParameters } from './Interfaces';

const db = new sqlite3.Database('./Kinnisvara.db');

function SqliteInsert({
    Table, Area, Address, Rooms, Size, Price, FromWork, Website, Latitude,
    Longitude, Year, Condition, EnergyClass, Technical, Floors, Floor,
    HVAC, Kitchen, Bathroom, BuildingType, Other, EHRCode, Purpose
}: SqliteInsertParameters): any {
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