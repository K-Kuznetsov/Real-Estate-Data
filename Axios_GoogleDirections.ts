import axios from 'axios';
import { APIKey, WorkAddress } from './PrivateData.json';

const TravelMode = 'walking'; // Other options are driving, bicycling, transit.

interface GoogleDirectionsResponse {
    lat: number;
    lon: number;
    FromWork: string;
};

async function GoogleDirectionsAPI(Address: string): Promise<GoogleDirectionsResponse> {
    const response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(Address)}&destination=${encodeURIComponent(WorkAddress)}&mode=${encodeURIComponent(TravelMode)}&key=${APIKey}`);
    const FromWork = (parseFloat(response.data.routes[0].legs[0].distance.value) / 1000).toFixed(3);
    const lat = response.data.routes[0].legs[0].start_location.lat;
    const lon = response.data.routes[0].legs[0].start_location.lng;
    return { lat, lon, FromWork };
};

export default GoogleDirectionsAPI;