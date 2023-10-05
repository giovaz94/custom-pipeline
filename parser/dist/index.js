"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const queue_1 = require("./queue/queue");
const app = (0, express_1.default)();
const port = process.env.PORT || 8000;
const queueName = process.env.QUEUE_NAME || 'demo-queue';
// const interval = 1000/parseInt(process.env.MCL, 10);
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
app.use(express_1.default.json());
app.post('/parse', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const taskToSubmit = {
            data: req.body,
            time: new Date().toString()
        };
        yield (0, queue_1.addInQueue)(queueName, taskToSubmit);
        console.log(" ~[*] Task submitted to the queue successfully! ");
        res.status(200).send("Task submitted to the queue successfully!");
    }
    catch (error) {
        res.status(500).send("Error sending the request");
    }
}));
app.listen(port, () => {
    (0, queue_1.startConsumer)(queueName, (task) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(` ~[X] Task processed at ${new Date().toString()}`);
    }));
    console.log(`Message parser launched at http://localhost:${port}`);
});
