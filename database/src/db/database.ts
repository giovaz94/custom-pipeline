export class DB {
    private messageInfo: Map<string, number>;
    private arrivalTime: Map<string, number>;
    private inboundWorkload: number;
    private totalTime: number;
    private totalMessages: number;
    private rejected: number;
    private oneSecWorkload: number;

    constructor() {
        this.messageInfo = new Map();
        this.arrivalTime = new Map();
        this.inboundWorkload = 0;
        this.totalTime = 0;
        this.totalMessages = 0;
        this.rejected = 0;
        this.oneSecWorkload = 0;
    }

    insertMessageInformation(id:string, n_attach:number) {
        this.messageInfo.set(id, n_attach);
        this.arrivalTime.set(id, Date.now());
    }

    messageLoss(id:string) {
        if (this.messageInfo.has(id)) {
            this.messageInfo.delete(id);
            this.arrivalTime.delete(id);
        }
        this.rejected++;
    }

    messageArrived() {
        this.inboundWorkload++;
        this.oneSecWorkload++;
    }

    insertResult(id:string) {
        let numberOfActivityWaiting = -1;
        if(this.messageInfo.has(id)) {
            numberOfActivityWaiting = (this.messageInfo.get(id) as number) - 1;
            this.messageInfo.set(id,numberOfActivityWaiting);
        }
        return numberOfActivityWaiting;
    }

    returnMessageResults(id:string) {
        let messageResults = "Message not found";
        if (this.messageInfo.has(id)) {
            messageResults = "Message <" + id + "> completely processed";
            this.messageInfo.delete(id);
            this.totalTime += (Date.now() - (this.arrivalTime.get(id) as number));
            this.totalMessages++;
        }
        return messageResults;
    }

    returnAverageAnalysisTime() {
        let averageTime = 1000000;
        if (this.totalMessages !== 0) averageTime = this.totalTime / this.totalMessages;
        return averageTime;
    }

    one_sec_timeout() {this.oneSecWorkload = 0;}

    get_inbound_workload() {return this.inboundWorkload;}

    get_one_sec_workload() {return this.oneSecWorkload;}

    messageCompleted() {return this.totalMessages;}

    rejectedMessages() {return this.rejected;}

    resetMetrics() {
        this.totalMessages = 0;
        this.totalTime = 0;
        this.inboundWorkload = 0;
        this.rejected = 0;
    }
}