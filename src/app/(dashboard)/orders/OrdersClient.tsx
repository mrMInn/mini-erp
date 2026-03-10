'use client';

import React, { useState } from 'react';
import { Table, Tag, Typography, Input, Space, Button, Modal, InputNumber, message, Popconfirm, Row, Col, Descriptions, Divider } from 'antd';
import { EyeOutlined, RollbackOutlined, PrinterOutlined, HistoryOutlined, SearchOutlined } from '@ant-design/icons';
import { refundOrderItemAction } from '@/actions/orders.actions';
import { getFullName, formatCurrency } from '@/utils/helpers';
import { createClient } from '@/lib/supabase/client';
import dayjs from 'dayjs';
import './orders.css';
import { text } from 'stream/consumers';

const { Text } = Typography;
const { Search } = Input;

// ═══════════ HELPERS ═══════════
const formatSpecs = (specsObj: any) => {
    if (!specsObj) return null;
    return (
        <Space size={[0, 4]} wrap style={{ marginTop: 4 }}>
            {specsObj.cpu && <Tag color="blue" style={{ border: 'none', background: 'rgba(10,132,255,0.1)' }}>{specsObj.cpu}</Tag>}
            {specsObj.ram && <Tag color="cyan" style={{ border: 'none', background: 'rgba(50,173,230,0.1)', color: '#0071a4' }}>RAM {specsObj.ram}</Tag>}
            {specsObj.storage && <Tag color="purple" style={{ border: 'none', background: 'rgba(175,82,222,0.1)', color: '#8944ab' }}>SSD {specsObj.storage}</Tag>}
            {specsObj.battery && <Tag color="green" style={{ border: 'none', background: 'rgba(52,199,89,0.1)', color: '#248a3d' }}>Pin: {specsObj.battery}</Tag>}
            {specsObj.mdm && <Tag color="red" style={{ border: 'none', background: 'rgba(255,59,48,0.1)', color: '#c41a12', fontWeight: 600 }}>CÓ MDM</Tag>}
        </Space>
    );
};

export default function OrdersClient({ ordersData }: { ordersData: any[] }) {
    const [orders, setOrders] = useState<any[]>(ordersData);
    const [searchText, setSearchText] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [refundFee, setRefundFee] = useState(0);
    const [currentUser, setCurrentUser] = useState('');
    const supabase = createClient();

    React.useEffect(() => {
        supabase.auth.getUser().then(({ data }) => { if (data?.user?.email) setCurrentUser(data.user.email); });
    }, []);

    const handlePrintBill = async (item: any) => {
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const orderId = selectedOrder.id.substring(0, 6).toUpperCase();
            const dateStr = dayjs(selectedOrder.sale_date).format('DD/MM/YYYY HH:mm');
            const customerData = selectedOrder.customers || { full_name: 'Khách vãng lai', phone: '' };

            const htmlString = `
                <div style="padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; width: 650px; margin: 0 auto; box-sizing: border-box;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: #1d1d1f;">KM DIGITAL</div>
                        <div style="font-size: 13px; color: #86868b; margin-top: 4px;">Chuyên Apple & Laptop Cao Cấp</div>
                        <div style="font-size: 13px; color: #86868b;">Hotline: 0988.888.888</div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1d1d1f; padding-bottom: 15px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 600; color: #1d1d1f; margin-bottom: 8px;">PHIẾU BẢO HÀNH KIÊM HÓA ĐƠN</div>
                            <div style="font-size: 13px; color: #515154;">Mã Phiếu: <strong>#${orderId}</strong></div>
                            <div style="font-size: 13px; color: #515154;">Ngày mua: ${dateStr}</div>
                            <div style="font-size: 13px; color: #515154;">Nhân viên: ${selectedOrder.seller_email.split('@')[0]}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 13px; color: #515154;">Khách hàng: <strong>${customerData.full_name || customerData.name}</strong></div>
                            <div style="font-size: 13px; color: #515154;">Điện thoại: ${customerData.phone}</div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #c7c7cc;">
                                <th style="text-align: left; padding-bottom: 10px; color: #86868b; font-weight: 500;">Tên Sản phẩm</th>
                                <th style="text-align: right; padding-bottom: 10px; color: #86868b; font-weight: 500;">Bảo hành</th>
                                <th style="text-align: right; padding-bottom: 10px; color: #86868b; font-weight: 500;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #e5e5ea;">
                                <td style="padding: 12px 0; color: #1d1d1f; font-weight: 600;">
                                    ${getFullName(item.inventory?.models)}<br/>
                                    <span style="font-size: 12px; color: #86868b; font-weight: 400;">SN: ${item.inventory?.serial || 'N/A'}</span>
                                </td>
                                <td style="padding: 12px 0; text-align: right; color: #1d1d1f;">
                                    ${dayjs(item.warranty_end_date).format('YYYY-MM-DD') === dayjs(selectedOrder.sale_date).format('YYYY-MM-DD') ? 'Không BH' : `Đến ${dayjs(item.warranty_end_date).format('DD/MM/YYYY')}`}
                                </td>
                                <td style="padding: 12px 0; text-align: right; color: #1d1d1f;">
                                    ${formatCurrency(item.sale_price)}
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px;">
                        <div style="font-size: 12px; color: #86868b; width: 65%; line-height: 1.5;">
                            <i>Quy định bảo hành: Sản phẩm được bảo hành lỗi 1 đổi 1 hoặc sửa chữa miễn phí theo đúng tiêu chuẩn nhà sản xuất.<br/>Từ chối bảo hành đối với các trường hợp rơi vỡ, cấn móp, cháy nổ hoặc vào chất lỏng.</i>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 14px; color: #86868b; margin-bottom: 4px;">Đã thanh toán</div>
                            <div style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px;">${formatCurrency(item.sale_price)}</div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 50px; font-size: 14px; color: #1d1d1f; font-weight: 500;">
                        Cảm ơn quý khách đã tin tưởng và ủng hộ KM Digital!
                    </div>
                </div>
            `;

            const cleanName = (customerData.full_name || customerData.name || 'Khach').replace(/\\s+/g, '');
            const opt = {
                margin: 0,
                filename: `PhieuBH_${cleanName}_${item.inventory?.serial || orderId}.pdf`,
                image: { type: 'jpeg' as const, quality: 1.0 },
                html2canvas: { scale: 2, useCORS: true, windowWidth: 650 },
                jsPDF: { unit: 'px' as const, format: [650, 750] as [number, number], orientation: 'portrait' as const }
            };

            html2pdf().set(opt).from(htmlString).save();
        } catch (e) {
            console.error('Lỗi in phiếu:', e);
            message.error('Không thể in phiếu lúc này!');
        }
    };

    const handlePrintAllBills = async () => {
        try {
            if (!selectedOrder || !selectedOrder.order_items || selectedOrder.order_items.length === 0) return;
            const html2pdf = (await import('html2pdf.js')).default;
            const orderId = selectedOrder.id.substring(0, 6).toUpperCase();
            const dateStr = dayjs(selectedOrder.sale_date).format('DD/MM/YYYY HH:mm');
            const customerData = selectedOrder.customers || { full_name: 'Khách vãng lai', phone: '' };

            const itemsHtml = selectedOrder.order_items.map((item: any) => `
                <tr style="border-bottom: 1px solid #e5e5ea;">
                    <td style="padding: 12px 0; color: #1d1d1f; font-weight: 600;">
                        ${getFullName(item.inventory?.models)}<br/>
                        <span style="font-size: 12px; color: #86868b; font-weight: 400;">SN: ${item.inventory?.serial || 'N/A'}</span>
                    </td>
                    <td style="padding: 12px 0; text-align: right; color: #1d1d1f;">
                        ${dayjs(item.warranty_end_date).format('YYYY-MM-DD') === dayjs(selectedOrder.sale_date).format('YYYY-MM-DD') ? 'Không BH' : `Đến ${dayjs(item.warranty_end_date).format('DD/MM/YYYY')}`}
                    </td>
                    <td style="padding: 12px 0; text-align: right; color: #1d1d1f;">
                        ${formatCurrency(item.sale_price)}
                    </td>
                </tr>
            `).join('');

            const htmlString = `
                <div style="padding: 30px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #fff; width: 650px; margin: 0 auto; box-sizing: border-box;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <div style="font-size: 26px; font-weight: 700; letter-spacing: -0.5px; color: #1d1d1f;">KM DIGITAL</div>
                        <div style="font-size: 13px; color: #86868b; margin-top: 4px;">Chuyên Apple & Laptop Cao Cấp</div>
                        <div style="font-size: 13px; color: #86868b;">Hotline: 0988.888.888</div>
                    </div>
                    
                    <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #1d1d1f; padding-bottom: 15px; margin-bottom: 20px;">
                        <div>
                            <div style="font-size: 18px; font-weight: 600; color: #1d1d1f; margin-bottom: 8px;">PHIẾU BẢO HÀNH KIÊM HÓA ĐƠN</div>
                            <div style="font-size: 13px; color: #515154;">Mã Phiếu: <strong>#${orderId}</strong></div>
                            <div style="font-size: 13px; color: #515154;">Ngày mua: ${dateStr}</div>
                            <div style="font-size: 13px; color: #515154;">Nhân viên: ${selectedOrder.seller_email.split('@')[0]}</div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 13px; color: #515154;">Khách hàng: <strong>${customerData.full_name || customerData.name}</strong></div>
                            <div style="font-size: 13px; color: #515154;">Điện thoại: ${customerData.phone}</div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px;">
                        <thead>
                            <tr style="border-bottom: 1px solid #c7c7cc;">
                                <th style="text-align: left; padding-bottom: 10px; color: #86868b; font-weight: 500;">Tên Sản phẩm</th>
                                <th style="text-align: right; padding-bottom: 10px; color: #86868b; font-weight: 500;">Bảo hành</th>
                                <th style="text-align: right; padding-bottom: 10px; color: #86868b; font-weight: 500;">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                    </table>

                    <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-top: 30px;">
                        <div style="font-size: 12px; color: #86868b; width: 65%; line-height: 1.5;">
                            <i>Quy định bảo hành: Sản phẩm được bảo hành lỗi 1 đổi 1 hoặc sửa chữa miễn phí theo đúng tiêu chuẩn nhà sản xuất.<br/>Từ chối bảo hành đối với các trường hợp rơi vỡ, cấn móp, cháy nổ hoặc vào chất lỏng.</i>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 14px; color: #86868b; margin-bottom: 4px;">Đã thanh toán</div>
                            <div style="font-size: 22px; font-weight: 700; color: #1d1d1f; letter-spacing: -0.5px;">${formatCurrency(selectedOrder.total_amount)}</div>
                        </div>
                    </div>
                    
                    <div style="text-align: center; margin-top: 50px; font-size: 14px; color: #1d1d1f; font-weight: 500;">
                        Cảm ơn quý khách đã tin tưởng và ủng hộ KM Digital!
                    </div>
                </div>
            `;

            const cleanName = (customerData.full_name || customerData.name || 'Khach').replace(/\\s+/g, '');
            const opt = {
                margin: 0,
                filename: `PhieuBH_${cleanName}_Tong_Don_${orderId}.pdf`,
                image: { type: 'jpeg' as const, quality: 1.0 },
                html2canvas: { scale: 2, useCORS: true, windowWidth: 650 },
                jsPDF: { unit: 'px' as const, format: [650, 750 + (selectedOrder.order_items.length * 60)] as [number, number], orientation: 'portrait' as const }
            };

            html2pdf().set(opt).from(htmlString).save();
        } catch (e) {
            console.error('Lỗi in phiếu:', e);
            message.error('Không thể in toàn bộ đơn lúc này!');
        }
    };

    const handleRefund = async (orderItemId: string) => {
        const res = await refundOrderItemAction(orderItemId, refundFee, currentUser);
        if (res.success) {
            message.success(res.message);
            setRefundFee(0);
            // Remove refunded item locally
            setOrders(prev => prev.map(o => ({
                ...o,
                order_items: (o.order_items || []).map((i: any) =>
                    i.id === orderItemId ? { ...i, status: 'refunded', refund_fee: refundFee } : i
                )
            })));
            if (selectedOrder) {
                setSelectedOrder((prev: any) => ({
                    ...prev,
                    order_items: (prev.order_items || []).map((i: any) =>
                        i.id === orderItemId ? { ...i, status: 'refunded', refund_fee: refundFee } : i
                    )
                }));
            }
        } else {
            message.error(res.message);
        }
    };

    const filteredOrders = orders.filter(o => {
        if (!searchText) return true;
        const kw = searchText.toLowerCase();
        const customerName = (o.customers?.full_name || o.customers?.name || '').toLowerCase();
        const phone = (o.customers?.phone || '').toLowerCase();
        const serials = (o.order_items || []).map((i: any) => (i.inventory?.serial || '').toLowerCase()).join(' ');
        return customerName.includes(kw) || phone.includes(kw) || serials.includes(kw);
    });

    const columns: any[] = [
        {
            title: 'Ngày Bán', dataIndex: 'sale_date', width: 130,
            render: (v: string) => v ? dayjs(v).format('DD/MM/YYYY HH:mm') : '-',
            sorter: (a: any, b: any) => dayjs(a.sale_date).unix() - dayjs(b.sale_date).unix(),
            defaultSortOrder: 'descend' as const,
        },
        {
            title: 'Khách Hàng',
            render: (r: any) => (
                <div>
                    <Text strong>{r.customers?.full_name || r.customers?.name || 'Ẩn danh'}</Text><br />
                    <Text style={{ fontSize: 12, color: '#86868b' }}>📱 {r.customers?.phone || '-'}</Text>
                </div>
            ),
        },
        {
            title: 'Sản Phẩm', width: 280,
            render: (r: any) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {(r.order_items || []).map((item: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Text>{getFullName(item.inventory?.models)}</Text>
                            {item.status === 'refunded' && <Tag color="orange">Đã hoàn</Tag>}
                        </div>
                    ))}
                </div>
            ),
        },
        {
            title: 'Tổng Thu', dataIndex: 'total_amount', width: 140,
            render: (v: number) => <Text strong style={{ color: '#0A84FF' }}>{formatCurrency(v)}</Text>,
            sorter: (a: any, b: any) => a.total_amount - b.total_amount,
        },
        {
            title: 'Lợi Nhuận', width: 140,
            render: (r: any) => {
                const profit = (r.order_items || []).reduce((sum: number, i: any) =>
                    sum + (Number(i.sale_price || 0) - Number(i.historical_cost || 0)), 0);
                return <Text style={{ color: profit >= 0 ? '#34C759' : '#FF3B30', fontWeight: 'bold' }}>{formatCurrency(profit)}</Text>;
            },
        },
        {
            title: 'Người Bán', dataIndex: 'seller_email', width: 150,
            render: (v: string) => <Text style={{ color: '#86868b' }}>{v || '-'}</Text>,
        },
        {
            title: '', width: 100,
            render: (r: any) => (
                <Button type="primary" ghost icon={<EyeOutlined />} size="small"
                    style={{ borderColor: '#0A84FF', color: '#0A84FF', borderRadius: 8 }}
                    onClick={() => { setSelectedOrder(r); setIsDetailOpen(true); }}>
                    Chi tiết
                </Button>
            ),
        },
    ];

    return (
        <div className="orders-page">
            <div className="orders-header">
                <h2 className="orders-title">📋 Lịch Sử Đơn Hàng</h2>
                <Input
                    className="orders-search"
                    placeholder="Tìm theo tên khách, SĐT, serial..."
                    allowClear
                    onChange={(e) => setSearchText(e.target.value)}
                    size="large"
                    prefix={<SearchOutlined style={{ color: '#86868b' }} />}
                />
            </div>

            <div className="orders-table-container">
                <Table
                    columns={columns}
                    dataSource={filteredOrders}
                    rowKey="id"
                    pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (total) => `Tổng: ${total} đơn` }}
                    size="middle"
                    scroll={{ x: 900 }}
                />
            </div>

            {/* MODAL CHI TIẾT ĐƠN */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 18 }}>
                        <HistoryOutlined style={{ color: '#0A84FF' }} />
                        <span>Chi Tiết Đơn Hàng</span>
                    </div>
                }
                open={isDetailOpen}
                onCancel={() => { setIsDetailOpen(false); setSelectedOrder(null); }}
                footer={null}
                width={1000} // Tăng chiều rộng Modal
                centered
            >
                {selectedOrder && (
                    <div>
                        <div style={{ padding: '24px', background: '#ffffff', borderRadius: 16, marginBottom: 24, border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                            <Descriptions title={<Text style={{ fontSize: 16, fontWeight: 600, color: '#1d1d1f' }}>Thông Tin Tra Cứu</Text>} bordered size="small" column={{ xs: 1, sm: 2 }}>
                                <Descriptions.Item label="Khách Hàng">
                                    <Text strong style={{ fontSize: 15, color: '#1d1d1f' }}>{selectedOrder.customers?.full_name || selectedOrder.customers?.name}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Điện Thoại">
                                    <Text style={{ fontSize: 15, color: '#1d1d1f' }}>{selectedOrder.customers?.phone}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Nguồn Khách">
                                    {selectedOrder.customers?.facebook ? (
                                        <a href={selectedOrder.customers.facebook.startsWith('http') ? selectedOrder.customers.facebook : `https://${selectedOrder.customers.facebook}`} target="_blank" rel="noopener noreferrer">
                                            <Tag color="cyan" style={{ cursor: 'pointer', margin: 0, borderRadius: 6 }}>{selectedOrder.marketing_source || 'Facebook'}</Tag>
                                        </a>
                                    ) : (
                                        <Tag color="default" style={{ margin: 0, borderRadius: 6 }}>{selectedOrder.marketing_source || 'Chưa rõ'}</Tag>
                                    )}
                                </Descriptions.Item>
                                <Descriptions.Item label="Thời Gian Mua">
                                    <Text style={{ fontSize: 14, color: '#1d1d1f', fontWeight: 500 }}>{dayjs(selectedOrder.sale_date).format('DD/MM/YYYY HH:mm')}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Nhân Viên Chốt">
                                    <Text style={{ fontSize: 14, color: '#1d1d1f' }}>{selectedOrder.seller_email}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Trạng Thái Đơn">
                                    <Tag color="green" style={{ borderRadius: 6, margin: 0 }}>Thành Công</Tag>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>

                        <div style={{ background: '#ffffff', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.03)' }}>
                            <Table
                                columns={[
                                    {
                                        title: <div style={{ textAlign: 'center' }}>Sản Phẩm & Phụ Kiện</div>,
                                        render: (item: any) => (
                                            <div style={{ padding: '4px 0' }}>
                                                <Text style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f' }}>{getFullName(item.inventory?.models)}</Text>
                                                <div style={{ marginTop: 4 }}>
                                                    {formatSpecs(item.inventory?.models?.specs)}
                                                </div>
                                                <Space size={16} style={{ marginTop: 8 }}>
                                                    <Text style={{ color: '#86868b', fontSize: 13 }}>SN: <Text style={{ fontFamily: 'monospace', color: '#1d1d1f' }}>{item.inventory?.serial || 'N/A'}</Text></Text>
                                                    <Text style={{ color: '#86868b', fontSize: 13 }}>BH đến: <Text strong style={{ color: '#1d1d1f' }}>{item.warranty_end_date ? dayjs(item.warranty_end_date).format('DD/MM/YYYY') : 'Không'}</Text></Text>
                                                </Space>
                                            </div>
                                        )
                                    },
                                    { title: <div style={{ textAlign: 'center' }}>Giá Vốn</div>, dataIndex: 'historical_cost', align: 'right', render: (val: any) => <Text style={{ fontSize: 14, fontWeight: 500, color: '#86868b', whiteSpace: 'nowrap' }}>{formatCurrency(Number(val || 0))}</Text> },
                                    { title: <div style={{ textAlign: 'center' }}>Giá Bán</div>, dataIndex: 'sale_price', align: 'right', render: (val: any) => <Text style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1f', whiteSpace: 'nowrap' }}>{formatCurrency(Number(val || 0))}</Text> },
                                    {
                                        title: <div style={{ textAlign: 'center' }}>Lợi Nhuận</div>, align: 'right', render: (item: any) => {
                                            const p = Number(item.sale_price || 0) - Number(item.historical_cost || 0);
                                            return <Text style={{ color: p >= 0 ? '#34C759' : '#FF3B30', fontWeight: 600, fontSize: 15, whiteSpace: 'nowrap' }}>{p > 0 ? '+' : ''}{formatCurrency(p)}</Text>;
                                        }
                                    },
                                    {
                                        title: <div style={{ textAlign: 'center' }}>Trạng Thái</div>, align: 'center', render: (item: any) => {
                                            if (item.status === 'refunded') return <Tag color="error" style={{ borderRadius: 6, margin: 0, whiteSpace: 'nowrap' }}>Đã Hoàn</Tag>;
                                            return <Tag color="success" style={{ borderRadius: 6, margin: 0, whiteSpace: 'nowrap' }}>Đã Giao</Tag>;
                                        }
                                    },
                                    {
                                        title: <div style={{ textAlign: 'center' }}>Thao Tác</div>, align: 'center', render: (item: any) => {
                                            return (
                                                <Space size={8}>
                                                    <Button size="middle" type="default" icon={<PrinterOutlined />} onClick={() => handlePrintBill(item)} style={{ borderRadius: 8, color: '#1d1d1f', borderColor: '#d9d9d9', background: '#fafafa' }}>
                                                        In Đơn
                                                    </Button>
                                                    {item.status !== 'refunded' ? (
                                                        <Popconfirm title="Xác nhận hoàn máy?" description="Sẽ trả lại tồn kho và trừ doanh thu." onConfirm={() => handleRefund(item.id)} okText="Xác nhận" cancelText="Hủy">
                                                            <Button size="middle" danger icon={<RollbackOutlined />} style={{ borderRadius: 8 }}>Hoàn Máy</Button>
                                                        </Popconfirm>
                                                    ) : null}
                                                </Space>
                                            );
                                        }
                                    },
                                ]}
                                dataSource={selectedOrder.order_items || []}
                                rowKey="id"
                                pagination={false}
                                size="middle"
                            />
                            
                            <div style={{ padding: '24px', background: '#fafafa', borderTop: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Button type="primary" size="large" icon={<PrinterOutlined />} onClick={handlePrintAllBills} style={{ borderRadius: 10, background: '#1d1d1f', border: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.15)', fontWeight: 600, padding: '0 24px' }}>
                                    In Toàn Bộ Hoá Đơn
                                </Button>
                                <div style={{ textAlign: 'right' }}>
                                    <Text style={{ fontSize: 14, color: '#86868b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600, display: 'block', marginBottom: 4 }}>Tổng Tiền Thanh Toán</Text>
                                    <Text style={{ fontSize: 24, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-0.5px' }}>
                                        {formatCurrency(selectedOrder.total_amount)}
                                    </Text>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Modal >
        </div >
    );
}
