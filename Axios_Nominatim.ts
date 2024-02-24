import axios from 'axios';

interface NominatimResponse {
    address: {
        suburb: string;
    };
};

async function NominatimAPI(Latitude: string, Longitude: string): Promise<string> {
    const Response = await axios.get<NominatimResponse>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${Latitude}&lon=${Longitude}`);
    const Area = Response.data.address.suburb;
    return Area;
};

export default NominatimAPI;
