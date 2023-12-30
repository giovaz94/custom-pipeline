import {sleep} from 'k6';
import http from 'k6/http';

export const options = {
    scenarios: {
        contacts: {
            executor: 'ramping-arrival-rate',
            preAllocatedVUs: 100,
            timeUnit: '1s',
            startRate: 40,
            stages: [
                { target: 60, duration: '0' },
                { target: 60, duration: '20s'},
                { target: 110, duration: '20s' },
                { target: 120, duration: '30s' },
                { target: 154, duration: '2m' },
            ],
        },
    },
};
export default () => {
    http.post('http://localhost:8010', JSON.stringify({ id: Math.floor(Math.random() * 1000)}));
    sleep(1);
};