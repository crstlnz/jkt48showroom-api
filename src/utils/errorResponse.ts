export class ApiError extends Error {
  data: Utils.ErrorData
  constructor(data: Utils.ErrorData) {
    super(data.error?.message || data.message)
    this.data = data
  }

  toJSON() {
    return {
      ...this.data,
    }
  }
}

export function createError(data: Utils.ErrorData): ApiError {
  return new ApiError({
    error: data.error,
    status: data.statusCode || data.status || 500,
    message: data.statusMessage || data.message || 'An error occured!',
  })
}
