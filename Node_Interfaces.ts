interface BaseInfoType {
    Address: string | null;
    Price: string | null;
    Website: string | null;
};

interface ExternalDataType {
    Latitude: string | null;
    Longitude: string | null;
    FromWork: string | null;
    Area: string | null;
    EHRCode: string | null;
    Year: string | null;
    Purpose: string | null;
    Floors: string | null;
    EnergyClass: string | null;
};

interface ExtraInfoType {
    Floor: string | null;
    Condition: string | null;
    Size: string | null;
    Rooms: string | null;
    Kitchen: string | null;
    Bathroom: string | null;
    HVAC: string | null;
    Technical: string | null;
    Other: string | null;
    BuildingType: string | null;
};

interface SqliteInsertParameters {
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

export { BaseInfoType, ExternalDataType, ExtraInfoType, SqliteInsertParameters };