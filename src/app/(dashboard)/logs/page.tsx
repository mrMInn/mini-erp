import React from 'react';
import { fetchLogsAction } from '@/actions/logs.actions';
import LogsClient from './LogsClient';
import { Alert } from 'antd';

export const dynamic = 'force-dynamic';

export default async function LogsPage() {
    const res = await fetchLogsAction();

    if (!res.success) {
        return <Alert message="Lỗi tải nhật ký hệ thống" description={(res as any).message} type="error" style={{ margin: 32 }} />;
    }

    return <LogsClient logsData={res.data || []} />;
}
