export type TaskType = {
    data: any;
    time: String;
}

const queueLimit = parseInt(process.env.QUEUE_LIMIT as string) || 1000;
export let queue: TaskType[] = [];
export let pendingPromises: ((item: TaskType) => void)[] = [];

export async function enqueue(item: TaskType): Promise<Boolean> {
    if(queue.length < queueLimit) {
        if (pendingPromises.length > 0) {
            const resolve = pendingPromises.shift();
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
      return new Promise<TaskType>((resolve) => pendingPromises.push(resolve));
    }
}

