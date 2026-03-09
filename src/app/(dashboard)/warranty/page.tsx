'use client';

import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, DatePicker, Typography, Card, message, Tag, Space, Tabs, Row, Col, Select } from 'antd';
import { PlusOutlined, ToolOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { fetchWarrantyLogsAction, fetchActiveWarrantyItemsAction, createWarrantyLogAction, updateWarrantyLogAction } from '@/actions/warranty.actions';
import { getFullName, formatCurrency } from '@/utils/helpers';
import dayjs from 'dayjs';
import '../dashboard.css';

const { Title, Text } = Typography;

export default function WarrantyPage() {
    const [logs, setLogs] = useState<any[]>([]);
    const [warrantyItems, setWarrantyItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
    const [returningId, setReturningId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [createForm] = Form.useForm();
    const [returnForm] = Form.useForm();

    const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'items'>('pending');

    const loadData = async () => {
        setLoading(true);
        const [logsRes, itemsRes] = await Promise.all([
            fetchWarrantyLogsAction(),
            fetchActiveWarrantyItemsAction(),
        ]);
        if (logsRes.success) setLogs(logsRes.data || []);
        if (itemsRes.success) setWarrantyItems(itemsRes.data || []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (values: any) => {
        setIsSubmitting(true);
        const res = await createWarrantyLogAction({
            order_item_id: values.order_item_id,
            receive_date: values.receive_date.toISOString(),
            issue_description: values.issue_description,
            note: values.note,
        });
        if (res.success) { message.success(res.message); setIsCreateModalOpen(false); createForm.resetFields(); loadData(); }
        else message.error(res.message);
        setIsSubmitting(false);
    };

    const handleReturn = async (values: any) => {
        setIsSubmitting(true);
        const res = await updateWarrantyLogAction(returningId, {
            return_date: values.return_date.toISOString(),
            note: values.note,
        });
        if (res.success) { message.success(res.message); setIsReturnModalOpen(false); returnForm.resetFields(); loadData(); }
        else message.error(res.message);
        setIsSubmitting(false);
    };

    const pendingLogs = logs.filter(l => !l.return_date);
    const completedLogs = logs.filter(l => l.return_date);

    const logColumns: any[] = [
        {
            title: 'Máy', render: (r: any) => {
                const inv = r.order_items?.inventory;
                return (
                    <div>
                        <Text strong>{getFullName(inv?.models)}</Text><br />
                        <Text type="secondary" style={{ fontSize: 12 }}>SN: {inv?.serial || 'N/A'}</Text>
                    </div>
                );
            }
        },
        { title: 'Mô tả lỗi', dataIndex: 'issue_description', ellipsis: true },
        {
            title: 'Ngày nhận', dataIndex: 'receive_date', width: 110,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
        },
        {
            title: 'Ngày trả', dataIndex: 'return_date', width: 110,
            render: (v: string) => v ? <Text style={{ color: '#52c41a' }}>{dayjs(v).format('DD/MM/YYYY')}</Text> : <Tag color="orange"><ClockCircleOutlined /> Đang sửa</Tag>,
        },
        {
            title: 'Thời gian', width: 100,
            render: (r: any) => {
                const start = dayjs(r.receive_date);
                const end = r.return_date ? dayjs(r.return_date) : dayjs();
                const days = end.diff(start, 'day');
                return <Tag color={days > 7 ? 'red' : 'blue'}>{days} ngày</Tag>;
            }
        },
        { title: 'Ghi chú', dataIndex: 'note', ellipsis: true, width: 150 },
        {
            title: '', width: 110, render: (r: any) => {
                if (r.return_date) return <Tag color="green"><CheckCircleOutlined /> Đã xong</Tag>;
                return (
                    <Button type="primary" size="small" style={{ background: '#52c41a' }}
                        onClick={() => { setReturningId(r.id); setIsReturnModalOpen(true); }}>
                        Trả máy
                    </Button>
                );
            }
        },
    ];

    const warrantyItemColumns: any[] = [
        {
            title: 'Máy', render: (r: any) => (
                <div>
                    <Text strong>{getFullName(r.inventory?.models)}</Text><br />
                    <Text type="secondary" style={{ fontSize: 12 }}>SN: {r.inventory?.serial || 'N/A'}</Text>
                </div>
            )
        },
        {
            title: 'Hết hạn BH', dataIndex: 'warranty_end_date', width: 130,
            render: (v: string) => {
                if (!v) return '-';
                const d = dayjs(v);
                const daysLeft = d.diff(dayjs(), 'day');
                return (
                    <div>
                        <Text>{d.format('DD/MM/YYYY')}</Text><br />
                        <Tag color={daysLeft < 30 ? 'red' : daysLeft < 90 ? 'orange' : 'green'}>
                            Còn {daysLeft} ngày
                        </Tag>
                    </div>
                );
            },
            sorter: (a: any, b: any) => dayjs(a.warranty_end_date).unix() - dayjs(b.warranty_end_date).unix(),
        },
        { title: 'Giá bán', dataIndex: 'sale_price', render: (v: number) => formatCurrency(v), width: 130 },
    ];

    const pendingOver7Days = pendingLogs.filter(l => dayjs().diff(dayjs(l.receive_date), 'day') > 7).length;

    return (
        <div className="dashboard">
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h2 style={{ fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.5px', color: '#1d1d1f' }}>
                        🏥 Trung Tâm Bảo Hành
                    </h2>
                </div>

                {/* SUMMARY CARDS (Apple Wallet Style) */}
                <div className="glass-card section-gap" style={{ padding: '24px 32px' }}>
                    <div className="metric-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
                        <div className="metric-item">
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>
                                <ClockCircleOutlined style={{ marginRight: 6 }} /> Đang Tiếp Nhận Sửa
                            </div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: '#1d1d1f' }}>
                                {pendingLogs.length}
                            </div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Máy đang nằm bãi
                            </div>
                        </div>
                        <div className="metric-item" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 32 }}>
                            <div className="metric-label" style={{ fontSize: 14, color: '#FF3B30', marginBottom: 8, fontWeight: 500 }}>
                                ⚠️ Ngâm Quá Hạn (&gt;7 Ngày)
                            </div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: pendingOver7Days > 0 ? '#FF3B30' : '#34C759' }}>
                                {pendingOver7Days}
                            </div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Cần xử lý gấp
                            </div>
                        </div>
                        <div className="metric-item" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 32 }}>
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>
                                <CheckCircleOutlined style={{ marginRight: 6 }} /> Đã Bàn Giao Xong
                            </div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: '#34C759' }}>
                                {completedLogs.length}
                            </div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Tổng máy đã trả khách
                            </div>
                        </div>
                    </div>
                </div>

                {/* FILTER PILLS */}
                <div className="inv-filters" style={{ marginTop: 24, marginBottom: 20 }}>
                    <button
                        className={`filter-pill status-in_transit ${activeTab === 'pending' ? 'active' : ''}`}
                        onClick={() => setActiveTab('pending')}
                    >
                        <ClockCircleOutlined style={{ marginRight: 6 }} /> Đang Bảo Hành
                        <span className="filter-count" style={{ background: activeTab === 'pending' ? '#FF9500' : '#d9d9d9' }}>{pendingLogs.length}</span>
                    </button>
                    <button
                        className={`filter-pill status-in_stock ${activeTab === 'completed' ? 'active' : ''}`}
                        onClick={() => setActiveTab('completed')}
                    >
                        <CheckCircleOutlined style={{ marginRight: 6 }} /> Đã Hoàn Thành
                        <span className="filter-count" style={{ background: activeTab === 'completed' ? '#34C759' : '#d9d9d9' }}>{completedLogs.length}</span>
                    </button>
                    <button
                        className={`filter-pill status-sold ${activeTab === 'items' ? 'active' : ''}`}
                        onClick={() => setActiveTab('items')}
                    >
                        <ToolOutlined style={{ marginRight: 6 }} /> Máy Còn Hạn BH
                        <span className="filter-count" style={{ background: activeTab === 'items' ? '#86868b' : '#d9d9d9' }}>{warrantyItems.length}</span>
                    </button>
                </div>

                {/* ACTIVE TAB CONTENT */}
                <div className="inv-table-container">
                    {activeTab === 'pending' && (
                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '16px 20px 0' }}>
                                <h3 className="card-title" style={{ margin: 0, fontSize: 18 }}>Máy cần xử lý ({pendingLogs.length})</h3>
                                <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => setIsCreateModalOpen(true)} style={{ background: '#0A84FF', border: 'none', fontWeight: 600 }}>
                                    Nhận Bảo Hành Mới
                                </Button>
                            </div>
                            <Table columns={logColumns} dataSource={pendingLogs} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle"
                                locale={{ emptyText: 'Chưa có máy nào vào viện bảo hành 🎉' }} />
                        </div>
                    )}
                    
                    {activeTab === 'completed' && (
                        <div>
                            <div style={{ padding: '16px 20px 0', marginBottom: 20 }}>
                                <h3 className="card-title" style={{ margin: 0, fontSize: 18 }}>Lịch sử trả máy ({completedLogs.length})</h3>
                            </div>
                            <Table columns={logColumns} dataSource={completedLogs} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                        </div>
                    )}

                    {activeTab === 'items' && (
                        <div>
                            <div style={{ padding: '16px 20px 0', marginBottom: 20 }}>
                                <h3 className="card-title" style={{ margin: 0, fontSize: 18 }}>Dữ liệu máy khách đang dùng ({warrantyItems.length})</h3>
                            </div>
                            <Table columns={warrantyItemColumns} dataSource={warrantyItems} rowKey="id" loading={loading} pagination={{ pageSize: 15 }} size="middle" />
                        </div>
                    )}
                </div>

                {/* MODAL TẠO PHIẾU */}
                <Modal title="Tạo Phiếu Bảo Hành" open={isCreateModalOpen} confirmLoading={isSubmitting} onCancel={() => setIsCreateModalOpen(false)} onOk={() => createForm.submit()} okText="Tạo phiếu">
                    <Form form={createForm} layout="vertical" onFinish={handleCreate}>
                        <Form.Item name="order_item_id" label="Chọn máy đang bảo hành" rules={[{ required: true, message: 'Chọn máy!' }]}>
                            <Select showSearch placeholder="Gõ tên máy hoặc serial..." optionFilterProp="label"
                                options={warrantyItems.map(item => ({
                                    value: item.id,
                                    label: `${getFullName(item.inventory?.models)} — SN: ${item.inventory?.serial || 'N/A'}`,
                                }))}
                            />
                        </Form.Item>
                        <Form.Item name="receive_date" label="Ngày nhận máy" rules={[{ required: true, message: 'Chọn ngày!' }]} initialValue={dayjs()}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="issue_description" label="Mô tả lỗi / Triệu chứng" rules={[{ required: true, message: 'Nhập mô tả lỗi!' }]}>
                            <Input.TextArea rows={3} placeholder="VD: Màn hình nhấp nháy khi mở nắp, Pin sụt nhanh..." />
                        </Form.Item>
                        <Form.Item name="note" label="Ghi chú thêm">
                            <Input placeholder="Ghi chú nội bộ..." />
                        </Form.Item>
                    </Form>
                </Modal>

                {/* MODAL TRẢ MÁY */}
                <Modal title="Trả Máy Cho Khách" open={isReturnModalOpen} confirmLoading={isSubmitting} onCancel={() => setIsReturnModalOpen(false)} onOk={() => returnForm.submit()} okText="Xác nhận trả">
                    <Form form={returnForm} layout="vertical" onFinish={handleReturn}>
                        <Form.Item name="return_date" label="Ngày trả máy" rules={[{ required: true }]} initialValue={dayjs()}>
                            <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                        <Form.Item name="note" label="Ghi chú kết quả sửa chữa">
                            <Input.TextArea rows={2} placeholder="VD: Đã thay pin mới, test OK..." />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </div>
    );
}
