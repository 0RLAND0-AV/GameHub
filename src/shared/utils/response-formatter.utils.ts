import { ApiResponse } from '../types/api-response.type';

export class ResponseFormatter {
  
  static success<T>(message: string, data?: T): ApiResponse<T> {
    return {
      ok: true,
      message,
      data,
    };
  }

  static error(message: string, code?: string): ApiResponse {
    return {
      ok: false,
      message,
      error: {
        message,
        code,
      },
    };
  }
}