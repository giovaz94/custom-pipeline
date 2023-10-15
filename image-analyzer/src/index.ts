import {addInQueue, startConsumer} from "./queue/queue";

const queueName = process.env.QUEUE_NAME || 'imageanalyzer.queue';
const interval = 1000/parseInt(process.env.MCL as string, 10);
const exchangeName = process.env.EXCHANGE_NAME || 'pipeline.direct';

type analysisCheck = { recognizerCheck: Boolean, NSFWCheck: Boolean };
const imageAnalysisRequests = new Map<string, analysisCheck>();

const queueTypeImageRecognizer = process.env.QUEUE_IMAGE_RECOGNIZER || 'imagerec.req';
const queueTypeNsfwDetector = process.env.QUEUE_IMAGE_RECOGNIZER || 'nsfwdet.req';
const queueTypeMessageAnalyzer = process.env.QUEUE_IMAGE_RECOGNIZER || 'messageanalyzer.req';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

startConsumer(queueName, async (task) => {
    if(typeof task.data === 'string') {
        await sleep(interval);
        imageAnalysisRequests.set(task.data, { recognizerCheck: false, NSFWCheck: false });
        addInQueue(exchangeName, queueTypeImageRecognizer, task);
        addInQueue(exchangeName, queueTypeNsfwDetector, task);
    } else if("response" in task.data && imageAnalysisRequests.has(task.data.id)) {
        let analysis = imageAnalysisRequests.get(task.data.id) as analysisCheck
        if(task.data.type === "imageRecognizer") {
            analysis.recognizerCheck = true;
        } else if(task.data.type=== "nsfwDetector") {
            analysis.NSFWCheck = true;
        }
        if(analysis.recognizerCheck && analysis.NSFWCheck) {
            imageAnalysisRequests.delete(task.data.id);
            addInQueue(exchangeName, queueTypeMessageAnalyzer, task);
        }
    }
});

