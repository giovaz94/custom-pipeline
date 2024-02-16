export default class RequestCounter {
    private static instance: RequestCounter;
    private counter: number;

    private constructor() {
        this.counter = 0;
    }

    public static getInstance(): RequestCounter {
        if (!RequestCounter.instance) {
            RequestCounter.instance = new RequestCounter();
        }
        return RequestCounter.instance;
    }

    public increase(): void {
        this.counter++;
    }

    public reset(): void {
        this.counter = 0;
    }

    public getCount(): number {
        return this.counter;
    }
}
