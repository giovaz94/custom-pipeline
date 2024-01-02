export interface Metrics {
    insertMessageInformation(id:string, n_attach:number): void;
    messageLoss(id:string): void;
    insertResult(id:string): number;
    resetMetrics(): void;
    returnMessageResults(id:string): string;
    gerInboundWorkload(): number;
    setInboundWorkload(workload: number): void;
    getStatistics(): MetricsInfo;
}

export interface MessageResults {
    returnMessageResults(id:string): string;
}

export type MetricsInfo = {
    messageInfo: Map<string, number>;
    arrivalTime: Map<string, number>;
    receivedMessages: number;
    rejectedMessages: number;
    totalTime: number;
    inboundWorkload: number;
};


export class GlobalMetrics implements Metrics, MessageResults {
    private metricsInfos: MetricsInfo;

    constructor() {
        this.metricsInfos = {
            messageInfo: new Map(),
            arrivalTime: new Map(),
            receivedMessages: 0,
            rejectedMessages: 0,
            totalTime: 0,
            inboundWorkload: 0,
        }
    }

    gerInboundWorkload(): number {
        return this.metricsInfos.inboundWorkload;
    }

    setInboundWorkload(workload: number) {
        this.metricsInfos.inboundWorkload = workload;
    }

    insertMessageInformation(id:string, n_attach:number) {
        this.metricsInfos.messageInfo.set(id, n_attach);
        this.metricsInfos.arrivalTime.set(id, Date.now());
    }

    messageLoss(id:string) {
        if (this.metricsInfos.messageInfo.has(id)) {
            this.metricsInfos.messageInfo.delete(id);
            this.metricsInfos.arrivalTime.delete(id);
        }
        this.metricsInfos.rejectedMessages++;
    }

    insertResult(id:string) {
        let numberOfActivityWaiting = -1;
        if(this.metricsInfos.messageInfo.has(id)) {
            numberOfActivityWaiting = (this.metricsInfos.messageInfo.get(id) as number) - 1;
            this.metricsInfos.messageInfo.set(id,numberOfActivityWaiting);
        }
        return numberOfActivityWaiting;
    }

    returnMessageResults(id:string) {
        let messageResults = "Message not found";
        if (this.metricsInfos.messageInfo.has(id)) {
            messageResults = "Message <" + id + "> completely processed";
            this.metricsInfos.messageInfo.delete(id);
            this.metricsInfos.totalTime += (Date.now() - (this.metricsInfos.arrivalTime.get(id) as number));
            this.metricsInfos.receivedMessages++;
        }
        return messageResults;
    }

    returnAverageAnalysisTime() {
        let averageTime = 1000000;
        if (this.metricsInfos.receivedMessages !== 0) {
            averageTime = this.metricsInfos.totalTime / this.metricsInfos.receivedMessages;
        }
        return averageTime;
    }

    resetMetrics() {
        this.metricsInfos = {
            messageInfo: new Map(),
            arrivalTime: new Map(),
            receivedMessages: 0,
            rejectedMessages: 0,
            totalTime: 0,
            inboundWorkload: this.metricsInfos.inboundWorkload
        }
    }

    getStatistics(): MetricsInfo {
        return this.metricsInfos;
    }
}