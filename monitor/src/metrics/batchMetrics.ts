import {Metrics, MetricsInfo} from "./globalMetrics";

type MetricRecord = {
    averageLatency: number;
    rejectedMessages: number;
}

type BatchResults = {
    returnResults(): Map<string, MetricRecord>;
}

export class BatchMetrics implements Metrics, BatchResults {

    private batchSize: number;
    private resultsMap: Map<string, MetricRecord>;
    private recordNumber: number;
    private metricsInfos: MetricsInfo;

    constructor(batchSize: number, recordNumber: number) {
        this.batchSize = batchSize;
        this.resultsMap = new Map();
        this.recordNumber = recordNumber;

        this.metricsInfos = {
            messageInfo: new Map(),
            arrivalTime: new Map(),
            receivedMessages: 0,
            rejectedMessages: 0,
            totalTime: 0,
            inboundWorkload: 0,
            oneSecWorkload: 0
        }
    }

    gerInboundWorkload(): number {
        return this.metricsInfos.inboundWorkload;
    }

    returnResults(): Map<string, MetricRecord> {
        return this.resultsMap;
    }

    insertMessageInformation(id: string, n_attach: number): void {
        this.metricsInfos.messageInfo.set(id, n_attach);
        this.metricsInfos.arrivalTime.set(id, Date.now());
    }

    insertResult(id: string): number {
        let numberOfActivityWaiting = -1;
        if(this.metricsInfos.messageInfo.has(id)) {
            numberOfActivityWaiting = (this.metricsInfos.messageInfo.get(id) as number) - 1;
            this.metricsInfos.messageInfo.set(id,numberOfActivityWaiting);
        }
        return numberOfActivityWaiting;
    }

    messageArrived(): void {
        this.metricsInfos.inboundWorkload++;
        this.metricsInfos.oneSecWorkload++;
    }

    messageLoss(id: string): void {
        if (this.metricsInfos.messageInfo.has(id)) {
            this.metricsInfos.messageInfo.delete(id);
            this.metricsInfos.arrivalTime.delete(id);
        }
        this.metricsInfos.rejectedMessages++;
    }

    resetMetrics(): void {
        this.metricsInfos = {
            messageInfo: new Map(),
            arrivalTime: new Map(),
            receivedMessages: 0,
            rejectedMessages: 0,
            totalTime: 0,
            inboundWorkload: 0,
            oneSecWorkload: 0
        }
    }

    returnMessageResults(id: string): string {
        let messageResults = "Message not found";
        if (this.metricsInfos.messageInfo.has(id)) {
            messageResults = "Message <" + id + "> completely processed";
            this.metricsInfos.messageInfo.delete(id);
            this.metricsInfos.totalTime += (Date.now() - (this.metricsInfos.arrivalTime.get(id) as number));
            this.metricsInfos.receivedMessages++;

            if (this.metricsInfos.receivedMessages >= this.batchSize) {
                const averageLatency = this.metricsInfos.totalTime / this.metricsInfos.receivedMessages;
                if(this.resultsMap.size >= this.recordNumber) {
                    this.resultsMap.delete(this.resultsMap.keys().next().value);
                }
                const formattedDate = new Date().toISOString()
                    .replace(/T/, ' ')
                    .replace(/\..+/, '');

                const record: MetricRecord = {
                    averageLatency: averageLatency,
                    rejectedMessages: this.metricsInfos.rejectedMessages
                };
                this.resultsMap.set(formattedDate, record);
                this.resetMetrics();
            }

        }
        return messageResults;
    }
}