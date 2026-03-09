'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Input, Space } from 'antd';
import dayjs from 'dayjs';
import './logs.css';

const { Text } = Typography;
const { Search } = Input;

export default function LogsClient({ logsData }: { logsData: any[] }) {
    const [searchText, setSearchText] = useState('');

    const filteredLogs = logsData.filter(log => {
        if (!searchText) return true;
        const kw = searchText.toLowerCase();
        return (
            (log.actor_email || '').toLowerCase().includes(kw) ||
            (log.description || '').toLowerCase().includes(kw) ||
            (log.action || '').toLowerCase().includes(kw)
        );
    });

    const getActionTag = (action: string) => {
        switch (action) {
            case 'SELL': return <Tag color="green">BÁN HÀNG</Tag>;
            case 'REFUND': return <Tag color="orange">HOÀN TRẢ</Tag>;
            case 'DELETE': return <Tag color="red">XÓA</Tag>;
            case 'UPDATE': return <Tag color="blue">CẬP NHẬT</Tag>;
            case 'CREATE': return <Tag color="cyan">TẠO MỚI</Tag>;
            default: return <Tag color="default">{action}</Tag>;
        }
    };

    const columns: any[] = [
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            width: 150,
            render: (v: string) => <Text style={{ color: '#86868b' }}>{dayjs(v).format('DD/MM/YYYY HH:mm')}</Text>,
            sorter: (a: any, b: any) => dayjs(a.created_at).unix() - dayjs(b.created_at).unix(),
            defaultSortOrder: 'descend' as const,
        },
        {
            title: 'Hành động',
            dataIndex: 'action',
            width: 140,
            render: (v: string) => getActionTag(v),
            filters: [
                { text: 'BÁN HÀNG', value: 'SELL' },
                { text: 'HOÀN TRẢ', value: 'REFUND' },
                { text: 'XÓA', value: 'DELETE' },
                { text: 'CẬP NHẬT', value: 'UPDATE' },
                { text: 'TẠO MỚI', value: 'CREATE' },
            ],
            onFilter: (value: string, record: any) => record.action === value,
        },
        {
            title: 'Người thực hiện',
            dataIndex: 'actor_email',
            width: 220,
            render: (v: string) => <Text strong>{v}</Text>,
        },
        {
            title: 'Dữ liệu',
            dataIndex: 'table_name',
            width: 150,
            render: (v: string) => <Text style={{ color: '#86868b', fontSize: 13, textTransform: 'uppercase' }}>{v}</Text>,
        },
        {
            title: 'Chi tiết thao tác',
            dataIndex: 'description',
            render: (v: string) => <Text style={{ color: '#1d1d1f' }}>{v || '-'}</Text>,
        },
    ];

    return (
        <div className="logs-page">
            <div className="logs-header">
                <h2 className="logs-title">⚙️ Nhật Ký Hệ Thống</h2>
                <Search
                    className="logs-search"
                    placeholder="🔍 Tìm theo nhân viên hoặc nội dung..."
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    style={{ width: 400 }}
                    size="large"
                />
            </div>

            <div className="logs-table-container">
                <Table
                    columns={columns}
                    dataSource={filteredLogs}
                    rowKey="id"
                    pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} bản ghi` }}
                    size="middle"
                />
            </div>
        </div>
    );
}
