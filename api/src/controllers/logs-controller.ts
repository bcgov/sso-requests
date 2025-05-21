import { LogsService } from '@/services/logs-service';
import { inject, injectable } from 'tsyringe';

@injectable()
export class LogsController {
  constructor(@inject(LogsService) private readonly logsService: LogsService) {}

  public async getLogs(env: string, clientId: string, requestId: string, start: string, end: string, userId?: string) {
    return await this.logsService.fetchLogs(env, clientId, requestId, start, end, userId);
  }
}
