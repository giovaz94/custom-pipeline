export interface Metrics {
    insertMessageInformation(id:string, n_attach:number): void;
    messageLoss(id:string): void;
    messageArrived(): void;
    insertResult(id:string): number;
    updateMcl(mcl: number): void;
    resetMetrics(): void;
    returnMessageResults(id:string): string;
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
    oneSecWorkload: number;
    mcl: number;
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
            oneSecWorkload: 0,
            mcl: 0
        }
    }

    updateMcl(mcl: number): void {
        this.metricsInfos.mcl = mcl;
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

    messageArrived() {
        this.metricsInfos.inboundWorkload++;
        this.metricsInfos.oneSecWorkload++;
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
            inboundWorkload: 0,
            oneSecWorkload: 0,
            mcl: 0
        }
    }
}