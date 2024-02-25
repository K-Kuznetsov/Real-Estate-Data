import axios from 'axios';
import { APIKey, WorkAddress } from './PrivateData.json';

const TravelMode: string = 'walking'; // Other options are driving, bicycling, transit.

async function GoogleDirectionsAPI(Address: string): Promise<any> {
    const Response: any = await axios.get(`https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(Address)}&destination=${encodeURIComponent(WorkAddress)}&mode=${encodeURIComponent(TravelMode)}&key=${APIKey}`);
    const FromWork: string = (parseFloat(Response.data.routes[0].legs[0].distance.value) / 1000).toFixed(3);
    const Latitude: string = Response.data.routes[0].legs[0].start_location.lat;
    const Longitude: string = Response.data.routes[0].legs[0].start_location.lng;
    return { Latitude, Longitude, FromWork };
};

async function OpenStreetMapAPI(Latitude: string, Longitude: string): Promise<any> {
    const Response: any = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${Latitude}&lon=${Longitude}`);
    const Area: string = Response.data.address.suburb;
    return Area;
};

export { GoogleDirectionsAPI, OpenStreetMapAPI};