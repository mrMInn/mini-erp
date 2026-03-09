'use client';

import React, { useState, useEffect } from 'react';
import { Tabs, Table, Button, Modal, Form, Input, InputNumber, DatePicker, Select, Typography, Card, message, Popconfirm, Row, Col, Statistic, Space, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined, DollarOutlined, BankOutlined, FallOutlined, RiseOutlined } from '@ant-design/icons';
import { fetchExpensesAction, createExpenseAction, deleteExpenseAction, fetchCapitalAction, createCapitalAction, deleteCapitalAction } from '@/actions/accounting.actions';
import { formatCurrency } from '@/utils/helpers';
import dayjs from 'dayjs';
import { createClient } from '@/lib/supabase/client';
import '../dashboard.css';

const { Title, Text } = Typography;

export default function AccountingPage() {
    const supabase = createClient();
    const [actorEmail, setActorEmail] = useState('Hệ Thống');

    const [expenses, setExpenses] = useState<any[]>([]);
    const [capital, setCapital] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
    const [isCapitalModalOpen, setIsCapitalModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expenseForm] = Form.useForm();
    const [capitalForm] = Form.useForm();

    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) setActorEmail(user.email || 'Hệ Thống');
        
        const [expRes, capRes] = await Promise.all([fetchExpensesAction(), fetchCapitalAction()]);
        if (expRes.success) setExpenses(expRes.data || []);
        if (capRes.success) setCapital(capRes.data || []);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    // ═══════════ CHI PHÍ ═══════════
    const handleCreateExpense = async (values: any) => {
        setIsSubmitting(true);
        const res = await createExpenseAction({
            title: values.title,
            amount: values.amount,
            expense_date: values.expense_date.toISOString(),
            actor_email: actorEmail,
        });
        if (res.success) { message.success(res.message); setIsExpenseModalOpen(false); expenseForm.resetFields(); loadData(); }
        else message.error(res.message);
        setIsSubmitting(false);
    };

    const handleDeleteExpense = async (id: string) => {
        const res = await deleteExpenseAction(id, actorEmail);
        if (res.success) { message.success(res.message); loadData(); }
        else message.error(res.message);
    };

    // ═══════════ VỐN ═══════════
    const handleCreateCapital = async (values: any) => {
        setIsSubmitting(true);
        const res = await createCapitalAction({
            investor: values.investor,
            type: values.type,
            amount: values.amount,
            note: values.note || '',
            transaction_date: values.transaction_date.toISOString(),
            actor_email: actorEmail,
        });
        if (res.success) { message.success(res.message); setIsCapitalModalOpen(false); capitalForm.resetFields(); loadData(); }
        else message.error(res.message);
        setIsSubmitting(false);
    };

    const handleDeleteCapital = async (id: string) => {
        const res = await deleteCapitalAction(id, actorEmail);
        if (res.success) { message.success(res.message); loadData(); }
        else message.error(res.message);
    };

    // ═══════════ TÍNH TOÁN ═══════════
    const totalExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const totalInvested = capital.filter(c => c.type === 'invest').reduce((s, c) => s + Number(c.amount || 0), 0);
    const totalWithdrawn = capital.filter(c => c.type === 'withdraw').reduce((s, c) => s + Number(c.amount || 0), 0);
    const netCapital = totalInvested - totalWithdrawn;

    const expenseColumns: any[] = [
        { title: 'STT', render: (_: any, __: any, idx: number) => idx + 1, width: 50 },
        { title: 'Mô tả Chi phí', dataIndex: 'title', render: (v: string) => <Text strong>{v}</Text> },
        { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => <Text type="danger">{formatCurrency(v)}</Text>, width: 150 },
        {
            title: 'Ngày', dataIndex: 'expense_date', width: 120,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
            sorter: (a: any, b: any) => dayjs(a.expense_date).unix() - dayjs(b.expense_date).unix(),
            defaultSortOrder: 'descend' as const,
        },
        {
            title: '', width: 60, render: (r: any) => (
                <Popconfirm title="Xóa chi phí này?" onConfirm={() => handleDeleteExpense(r.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        },
    ];

    const capitalColumns: any[] = [
        { title: 'STT', render: (_: any, __: any, idx: number) => idx + 1, width: 50 },
        { title: 'Nhà đầu tư', dataIndex: 'investor', render: (v: string) => <Text strong>{v}</Text> },
        {
            title: 'Loại', dataIndex: 'type', width: 120,
            render: (v: string) => v === 'invest' ? <Tag color="green"><RiseOutlined /> Góp vốn</Tag> : <Tag color="red"><FallOutlined /> Rút vốn</Tag>
        },
        { title: 'Số tiền', dataIndex: 'amount', render: (v: number) => <Text strong>{formatCurrency(v)}</Text>, width: 150 },
        { title: 'Ghi chú', dataIndex: 'note', ellipsis: true },
        {
            title: 'Ngày GD', dataIndex: 'transaction_date', width: 120,
            render: (v: string) => dayjs(v).format('DD/MM/YYYY'),
            sorter: (a: any, b: any) => dayjs(a.transaction_date).unix() - dayjs(b.transaction_date).unix(),
            defaultSortOrder: 'descend' as const,
        },
        {
            title: '', width: 60, render: (r: any) => (
                <Popconfirm title="Xóa giao dịch vốn này?" onConfirm={() => handleDeleteCapital(r.id)} okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}>
                    <Button size="small" danger icon={<DeleteOutlined />} />
                </Popconfirm>
            )
        },
    ];

    return (
        <div className="dashboard">
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h2 style={{ fontSize: 26, fontWeight: 600, margin: 0, letterSpacing: '-0.5px', color: '#1d1d1f' }}>
                        Kế Toán & Quy Quỹ
                    </h2>
                </div>

                {/* SUMMARY CARDS (Apple Wallet Style) */}
                <div className="glass-card section-gap" style={{ padding: '24px 32px' }}>
                    <div className="metric-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
                        <div className="metric-item">
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>
                                <BankOutlined style={{ marginRight: 6 }} /> Tiền Quỹ Khả Dụng
                            </div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: '#1d1d1f' }}>
                                {formatCurrency(netCapital - totalExpenses)}
                            </div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Vốn - Chi Phí
                            </div>
                        </div>
                        <div className="metric-item" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 32 }}>
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>
                                <RiseOutlined style={{ marginRight: 6 }} /> Tổng Vốn Thuần
                            </div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: '#34C759' }}>
                                {formatCurrency(netCapital)}
                            </div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Đã cấn trừ rút vốn
                            </div>
                        </div>
                        <div className="metric-item" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 32 }}>
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>
                                <FallOutlined style={{ marginRight: 6 }} /> Tổng Chi Phí (P&L)
                            </div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: '#FF3B30' }}>
                                {formatCurrency(totalExpenses)}
                            </div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Trừ trực tiếp vào Lãi Ròng
                            </div>
                        </div>
                    </div>
                </div>

                <Tabs
                    className="apple-tabs"
                    style={{ marginTop: 16 }}
                    items={[
                        {
                            key: 'expenses',
                            label: <span style={{ fontSize: 15, fontWeight: 500 }}><FallOutlined /> Chi Phí Vận Hành</span>,
                            children: (
                                <div className="glass-card" style={{ marginTop: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <h3 className="card-title" style={{ margin: 0, fontSize: 18 }}>Lịch sử chi tiêu ({expenses.length})</h3>
                                        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => setIsExpenseModalOpen(true)} style={{ background: '#FF3B30', border: 'none', fontWeight: 600 }}>
                                            Ghi Chi Phí
                                        </Button>
                                    </div>
                                    <Table columns={expenseColumns} dataSource={expenses} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" />
                                </div>
                            ),
                        },
                        {
                            key: 'capital',
                            label: <span style={{ fontSize: 15, fontWeight: 500 }}><BankOutlined /> Vốn Góp / Rút</span>,
                            children: (
                                <div className="glass-card" style={{ marginTop: 16 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                                        <h3 className="card-title" style={{ margin: 0, fontSize: 18 }}>Giao dịch quỹ ({capital.length})</h3>
                                        <Button type="primary" shape="round" icon={<PlusOutlined />} onClick={() => setIsCapitalModalOpen(true)} style={{ background: '#34C759', border: 'none', fontWeight: 600 }}>
                                            Ghi Dòng Vốn
                                        </Button>
                                    </div>
                                    <Table columns={capitalColumns} dataSource={capital} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} size="middle" />
                                </div>
                            ),
                        },
                    ]} />

                {/* MODAL CHI PHÍ */}
                <Modal title="Thêm Chi Phí Vận Hành" open={isExpenseModalOpen} confirmLoading={isSubmitting} onCancel={() => setIsExpenseModalOpen(false)} onOk={() => expenseForm.submit()} okText="Lưu">
                    <Form form={expenseForm} layout="vertical" onFinish={handleCreateExpense}>
                        <Form.Item name="title" label="Mô tả chi phí" rules={[{ required: true, message: 'Nhập mô tả!' }]}>
                            <Input placeholder="VD: Tiền điện tháng 3, Mua bao bì..." />
                        </Form.Item>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="amount" label="Số tiền (VNĐ)" rules={[{ required: true, message: 'Nhập số tiền!' }]}>
                                    <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} placeholder="100,000" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="expense_date" label="Ngày phát sinh" rules={[{ required: true, message: 'Chọn ngày!' }]}>
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </Form>
                </Modal>

                {/* MODAL VỐN */}
                <Modal title="Thêm Giao Dịch Vốn" open={isCapitalModalOpen} confirmLoading={isSubmitting} onCancel={() => setIsCapitalModalOpen(false)} onOk={() => capitalForm.submit()} okText="Lưu">
                    <Form form={capitalForm} layout="vertical" onFinish={handleCreateCapital}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="investor" label="Tên nhà đầu tư" rules={[{ required: true, message: 'Nhập tên!' }]}>
                                    <Input placeholder="VD: Anh Minh, Chị Hương..." />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="type" label="Loại giao dịch" rules={[{ required: true, message: 'Chọn loại!' }]}>
                                    <Select options={[{ value: 'invest', label: '💚 Góp vốn' }, { value: 'withdraw', label: '🔴 Rút vốn' }]} placeholder="Chọn..." />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="amount" label="Số tiền (VNĐ)" rules={[{ required: true, message: 'Nhập số tiền!' }]}>
                                    <InputNumber style={{ width: '100%' }} min={1} formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="transaction_date" label="Ngày giao dịch" rules={[{ required: true, message: 'Chọn ngày!' }]}>
                                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                                </Form.Item>
                            </Col>
                        </Row>
                        <Form.Item name="note" label="Ghi chú">
                            <Input.TextArea rows={2} placeholder="Ghi chú thêm..." />
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </div>
    );
}
