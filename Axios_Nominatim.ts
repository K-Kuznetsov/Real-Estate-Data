import axios from 'axios';

interface NominatimResponse {
    address: {
        suburb: string;
    };
};

async function NominatimAPI(lat: string, lon: string): Promise<string> {
    try {
        const response = await axios.get<NominatimResponse>(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const Area = response.data.address.suburb;
        return Area;
    } catch (error) {
        console.error('Error fetching data from Nominatim API:', error);
        throw error;
    }
};

export default NominatimAPI;