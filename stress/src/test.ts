import { sleep} from 'k6';
import http from 'k6/http';

export const options = {
    stages: [
        { duration: '1m', target: 200 }, // traffic ramp-up from 1 to a higher 200 users over 10 minutes.
        { duration: '1m', target: 200 }, // stay at higher 200 users for 30 minutes
        { duration: '5m', target: 0 }, // ramp-down to 0 users
    ],
};

export default () => {
    // Post a random number between 1 and 1000 to the server
    http.post('http://localhost:8010', JSON.stringify({ id: Math.floor(Math.random() * 1000)}));
    sleep(1);
};