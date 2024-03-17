const processes = new Map<string, Promise<any>>()
export async function useSingleProcess<T>(id: string, process: () => Promise<T>): Promise<T> {
  let promise = processes.get(id)
  if (promise) {
    return await promise
  }
  else {
    promise = process()
    processes.set(id, promise)
    promise.then(() => {
      processes.delete(id)
    }).catch(() => {
      processes.delete(id)
    })
    return promise
  }
}
