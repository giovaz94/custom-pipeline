import {sleep} from 'k6';
import http from 'k6/http';

export const options = {
    scenarios: {
        contacts: {
            executor: 'ramping-arrival-rate',
            preAllocatedVUs: 200,
            timeUnit: '1s',
            startRate: 40,
            stages: [
                { target: 60, duration: '0' },
                { target: 60, duration: '20s'},
                { target: 110, duration: '0s' },
                { target: 110, duration: '20s' },
                { target: 120, duration: '0s' },
                { target: 120, duration: '20s' },
                { target: 154, duration: '0s' },
                { target: 154, duration: '2m' },
                { target: 120, duration: '20s' },
                { target: 110, duration: '20s' },
                { target: 60, duration: '20s'},
                { target: 40, duration: '20s'},
            ],
        },
    },
};
export default () => {
    http.post('http://localhost:8010', JSON.stringify({ id: Math.floor(Math.random() * 1000)}));
    sleep(1);
};