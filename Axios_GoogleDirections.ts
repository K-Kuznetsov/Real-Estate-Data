import axios from 'axios';
import { APIKey, WorkAddress } from './PrivateData.json';

const TravelMode = 'walking'; // Other options are driving, bicycling, transit.

interface GoogleDirectionsResponse {
    Latitude: string;
    Longitude: string;
    FromWork: string;
};

async function GoogleDirectionsAPI(Address: string): Promise<GoogleDirectionsResponse> {
    const Response = await axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(Address)}&destination=${encodeURIComponent(WorkAddress)}&mode=${encodeURIComponent(TravelMode)}&key=${APIKey}`);
    const FromWork = (parseFloat(Response.data.routes[0].legs[0].distance.value) / 1000).toFixed(3);
    const Latitude = Response.data.routes[0].legs[0].start_location.lat;
    const Longitude = Response.data.routes[0].legs[0].start_location.lng;
    return { Latitude, Longitude, FromWork };
};

export default GoogleDirectionsAPI;