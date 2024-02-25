import axios from 'axios';

async function NominatimAPI(Latitude: string, Longitude: string): Promise<any> {
    const Response: any = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${Latitude}&lon=${Longitude}`);
    const Area: string = Response.data.address.suburb;
    return Area;
};

export default NominatimAPI;
