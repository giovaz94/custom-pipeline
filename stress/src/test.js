"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.options = void 0;
var http = require("k6/http");
exports.options = {
    scenarios: {
        contacts: {
            executor: 'ramping-arrival-rate',
            preAllocatedVUs: 800,
            timeUnit: '1s',
            stages: [
                { target: 10, duration: '1s' },
                { target: 5, duration: '1s' },
                { target: 2, duration: '1s' },
                { target: 2, duration: '1s' },
                { target: 25, duration: '1s' },
                { target: 22, duration: '1s' },
                { target: 17, duration: '1s' },
                { target: 20, duration: '1s' },
                { target: 22, duration: '1s' },
                { target: 27, duration: '1s' },
                { target: 7, duration: '1s' },
                { target: 17, duration: '1s' },
                { target: 12, duration: '1s' },
                { target: 50, duration: '1s' },
                { target: 52, duration: '1s' },
                { target: 30, duration: '1s' },
                { target: 22, duration: '1s' },
                { target: 17, duration: '1s' },
                { target: 90, duration: '1s' },
                { target: 120, duration: '1s' },
                { target: 40, duration: '1s' },
                { target: 37, duration: '1s' },
                { target: 35, duration: '1s' },
                { target: 80, duration: '1s' },
                { target: 75, duration: '1s' },
                { target: 15, duration: '1s' },
                { target: 165, duration: '1s' },
                { target: 535, duration: '1s' },
                { target: 497, duration: '1s' },
                { target: 507, duration: '1s' },
                { target: 522, duration: '1s' },
                { target: 507, duration: '1s' },
                { target: 510, duration: '1s' },
                { target: 557, duration: '1s' },
                { target: 610, duration: '1s' },
                { target: 617, duration: '1s' },
                { target: 610, duration: '1s' },
                { target: 675, duration: '1s' },
                { target: 665, duration: '1s' },
                { target: 640, duration: '1s' },
                { target: 635, duration: '1s' },
                { target: 612, duration: '1s' },
                { target: 602, duration: '1s' },
                { target: 597, duration: '1s' },
                { target: 575, duration: '1s' },
                { target: 585, duration: '1s' },
                { target: 560, duration: '1s' },
                { target: 555, duration: '1s' },
                { target: 597, duration: '1s' },
                { target: 590, duration: '1s' },
                { target: 590, duration: '1s' },
                { target: 590, duration: '1s' },
                { target: 582, duration: '1s' },
                { target: 542, duration: '1s' },
                { target: 535, duration: '1s' },
                { target: 557, duration: '1s' },
                { target: 565, duration: '1s' },
                { target: 587, duration: '1s' },
                { target: 672, duration: '1s' },
                { target: 710, duration: '1s' },
                { target: 715, duration: '1s' },
                { target: 750, duration: '1s' },
                { target: 760, duration: '1s' },
                { target: 750, duration: '1s' },
                { target: 755, duration: '1s' },
                { target: 747, duration: '1s' },
                { target: 725, duration: '1s' },
                { target: 747, duration: '1s' },
                { target: 737, duration: '1s' },
                { target: 730, duration: '1s' },
                { target: 722, duration: '1s' },
                { target: 732, duration: '1s' },
                { target: 725, duration: '1s' },
                { target: 727, duration: '1s' },
                { target: 720, duration: '1s' },
                { target: 725, duration: '1s' },
                { target: 722, duration: '1s' },
                { target: 745, duration: '1s' },
                { target: 740, duration: '1s' },
                { target: 735, duration: '1s' },
                { target: 682, duration: '1s' },
                { target: 690, duration: '1s' },
                { target: 650, duration: '1s' },
                { target: 635, duration: '1s' },
                { target: 625, duration: '1s' },
                { target: 590, duration: '1s' },
                { target: 550, duration: '1s' },
                { target: 510, duration: '1s' },
                { target: 515, duration: '1s' },
                { target: 532, duration: '1s' },
                { target: 552, duration: '1s' },
                { target: 545, duration: '1s' },
                { target: 520, duration: '1s' },
                { target: 507, duration: '1s' },
                { target: 505, duration: '1s' },
                { target: 502, duration: '1s' },
                { target: 515, duration: '1s' },
                { target: 510, duration: '1s' },
                { target: 512, duration: '1s' },
                { target: 510, duration: '1s' },
                { target: 500, duration: '1s' },
                { target: 505, duration: '1s' },
                { target: 505, duration: '1s' },
                { target: 432, duration: '1s' },
                { target: 425, duration: '1s' },
                { target: 425, duration: '1s' },
                { target: 422, duration: '1s' },
                { target: 395, duration: '1s' },
                { target: 392, duration: '1s' },
                { target: 395, duration: '1s' },
                { target: 405, duration: '1s' },
                { target: 392, duration: '1s' },
                { target: 397, duration: '1s' },
                { target: 377, duration: '1s' },
                { target: 367, duration: '1s' },
                { target: 327, duration: '1s' },
                { target: 322, duration: '1s' },
                { target: 312, duration: '1s' },
                { target: 310, duration: '1s' },
                { target: 340, duration: '1s' },
                { target: 320, duration: '1s' },
                { target: 315, duration: '1s' },
                { target: 320, duration: '1s' },
                { target: 312, duration: '1s' },
                { target: 305, duration: '1s' },
                { target: 300, duration: '1s' },
                { target: 297, duration: '1s' },
                { target: 275, duration: '1s' },
                { target: 280, duration: '1s' },
                { target: 287, duration: '1s' },
                { target: 290, duration: '1s' },
                { target: 287, duration: '1s' },
                { target: 297, duration: '1s' },
                { target: 310, duration: '1s' },
                { target: 307, duration: '1s' },
                { target: 305, duration: '1s' },
                { target: 302, duration: '1s' },
                { target: 312, duration: '1s' },
                { target: 300, duration: '1s' },
                { target: 297, duration: '1s' },
                { target: 297, duration: '1s' },
                { target: 305, duration: '1s' },
                { target: 312, duration: '1s' },
                { target: 310, duration: '1s' },
                { target: 322, duration: '1s' },
                { target: 315, duration: '1s' },
                { target: 312, duration: '1s' },
                { target: 312, duration: '1s' },
                { target: 275, duration: '1s' },
                { target: 267, duration: '1s' },
                { target: 260, duration: '1s' },
                { target: 260, duration: '1s' },
                { target: 257, duration: '1s' },
                { target: 250, duration: '1s' },
                { target: 245, duration: '1s' },
                { target: 230, duration: '1s' },
                { target: 210, duration: '1s' },
                { target: 227, duration: '1s' },
                { target: 250, duration: '1s' },
                { target: 247, duration: '1s' },
                { target: 232, duration: '1s' },
                { target: 230, duration: '1s' },
                { target: 217, duration: '1s' },
                { target: 210, duration: '1s' },
                { target: 200, duration: '1s' },
                { target: 192, duration: '1s' },
                { target: 187, duration: '1s' },
                { target: 167, duration: '1s' },
                { target: 152, duration: '1s' },
                { target: 167, duration: '1s' },
                { target: 150, duration: '1s' },
                { target: 137, duration: '1s' },
                { target: 127, duration: '1s' },
                { target: 65, duration: '1s' },
                { target: 62, duration: '1s' },
                { target: 55, duration: '1s' },
                { target: 52, duration: '1s' },
                { target: 50, duration: '1s' },
                { target: 50, duration: '1s' },
                { target: 50, duration: '1s' },
                { target: 45, duration: '1s' },
                { target: 132, duration: '1s' },
                { target: 130, duration: '1s' },
                { target: 47, duration: '1s' },
                { target: 92, duration: '1s' },
                { target: 95, duration: '1s' },
                { target: 150, duration: '1s' },
                { target: 157, duration: '1s' },
                { target: 255, duration: '1s' },
                { target: 400, duration: '1s' },
                { target: 430, duration: '1s' },
                { target: 440, duration: '1s' },
                { target: 440, duration: '1s' },
                { target: 445, duration: '1s' },
                { target: 455, duration: '1s' },
                { target: 475, duration: '1s' },
                { target: 457, duration: '1s' },
                { target: 447, duration: '1s' },
                { target: 447, duration: '1s' },
                { target: 420, duration: '1s' },
            ],
        },
    },
};
exports.default = function () {
    http.post('http://152.42.150.86', {});
};