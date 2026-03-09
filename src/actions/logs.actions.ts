'use server';

import { LogsRepo } from '@/repositories/logs.repo';

export async function fetchLogsAction() {
    try {
        const data = await LogsRepo.getAuditLogs();
        return { success: true, data };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
