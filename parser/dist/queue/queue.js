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
exports.startConsumer = exports.addInQueue = void 0;
const rabbitmq_config_1 = __importDefault(require("../configuration/rabbitmq.config"));
function addInQueue(queueName, task) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield rabbitmq_config_1.default.getInstance();
        const channel = yield connection.createChannel();
        yield channel.assertQueue(queueName);
        yield channel.sendToQueue(queueName, Buffer.from(JSON.stringify(task)));
        yield channel.close();
        yield connection.close();
    });
}
exports.addInQueue = addInQueue;
function startConsumer(queueName, processTask) {
    return __awaiter(this, void 0, void 0, function* () {
        const connection = yield rabbitmq_config_1.default.getInstance();
        const channel = yield connection.createChannel();
        yield channel.assertQueue(queueName);
        channel.consume(queueName, (msg) => {
            if (msg !== null) {
                const taskData = JSON.parse(msg.content.toString());
                processTask(taskData);
                channel.ack(msg);
            }
        });
    });
}
exports.startConsumer = startConsumer;
