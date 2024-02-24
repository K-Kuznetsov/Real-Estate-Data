import axios from 'axios';

async function EHRBuildingSearch(Address: string): Promise<any> {
    const RequestBody: any = {
        buildingLocation: Address,
        buildingName: "",
        buildingStates: [""],
        firstUseDate: { from: "", to: "" },
        firstUseMissing: false,
        buildingType: ["H"],
        purposeOfUse: [""],
        ownershipType: [""]
    };

    const Response = await axios.post('https://devkluster.ehr.ee/api/building/v2/buildingSearch', RequestBody, { headers: { 'accept': 'application/json', 'Content-Type': 'application/json' } });
    const EHRCode: string = Response.data[0].ehrCode ? Response.data[0].ehrCode : null;
    const Year: string = Response.data[0].firstUseDate ? Response.data[0].firstUseDate: null;
    const Purpose: string = Response.data[0].purposeOfUse.value ? Response.data[0].purposeOfUse.value : null;
    const Floors: string = Response.data[0].floorCount ? Response.data[0].floorCount : null;
    return { EHRCode, Year, Purpose, Floors };
};

async function EHRBuildingData(EHRCode: string): Promise<any> {
    const Response: any = await axios.get(`https://devkluster.ehr.ee/api/building/v2/buildingData?ehr_code=${EHRCode}`);
    const EnergyClass: string = Response.data.ehitis.ehitiseEnergiamargised.energiamargis[0] ? Response.data.ehitis.ehitiseEnergiamargised.energiamargis[0].energiaKlass : null;
    return EnergyClass;
};

export { EHRBuildingSearch, EHRBuildingData };