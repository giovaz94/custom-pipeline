export type TaskType = {
    data: any;
    time: String;
}

const queueLimit = parseInt(process.env.QUEUE_LIMIT as string) || 10000000;
export let queue: TaskType[] = [];
export let inputPendingPromises: ((item: TaskType) => void)[] = [];

export async function enqueue(item: TaskType): Promise<Boolean> {
    if(queue.length < queueLimit) {
        if (inputPendingPromises.length > 0) {
            const resolve = inputPendingPromises.shift();
            resolve!(item);
        } else {
            queue.push(item);
        }
        return true;
    } else {
        return false;
    }
}

export async function dequeue(): Promise<TaskType> {
    if (queue.length > 0) {
        return queue.shift()!;
    } else {
        return new Promise<TaskType>((resolve) => inputPendingPromises.push(resolve));
    }
}
