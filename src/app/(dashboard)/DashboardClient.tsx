'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Tag } from 'antd';
import { PROFIT_RATIO, PARTNER_NAMES } from '@/constants';
import dayjs from 'dayjs';
import { getFullName } from '@/utils/helpers';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    PieChart, Pie, Cell,
} from 'recharts';
import './dashboard.css';

const COLORS = ['#FF9500', '#5E5CE6']; 

const fmtMoney = (v: number) => {
    if (v === 0) return '0đ';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000_000) return `${sign}${(abs / 1_000_000_000).toFixed(1)}tỷ`;
    if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}tr`;
    if (abs >= 1_000) return `${sign}${(abs / 1_000).toFixed(0)}K`;
    return `${sign}${abs}đ`;
};

const fmtFull = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';

export default function DashboardClient({
    inventory,
    periodProfitItems,
    dailyRevenue,
    allTimeProfitItems,
    sdCapitalTx,
    expenses
}: {
    inventory: any[];
    periodProfitItems: any[];
    dailyRevenue: any[];
    allTimeProfitItems: any[];
    sdCapitalTx: any[];
    expenses: any[];
}) {
    const chartRef = useRef<HTMLDivElement>(null);
    const [chartWidth, setChartWidth] = useState(400);

    useEffect(() => {
        const el = chartRef.current;
        if (!el) return;
        const ro = new ResizeObserver(entries => {
            for (const entry of entries) {
                setChartWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // ═══════════ CALCULATIONS ═══════════
    const calcProfit = (items: any[]) =>
        items.filter(i => i.status === 'sold').reduce((sum, i) =>
            sum + (Number(i.sale_price || 0) - Number(i.historical_cost || 0) + Number(i.accessory_fee || 0) - Number(i.refund_fee || 0)), 0);

    const periodRevenue = dailyRevenue.reduce((s, o) => s + Number(o.total_amount || 0), 0);
    const periodGrossProfit = calcProfit(periodProfitItems);
    const periodExpenses = expenses
        .filter(ex => {
            const d = dayjs(ex.expense_date);
            return d.isAfter(dayjs().subtract(11, 'month').startOf('month')) && d.isBefore(dayjs().endOf('day'));
        })
        .reduce((s, ex) => s + Number(ex.amount || 0), 0);

    const periodNetProfit = periodGrossProfit - periodExpenses;
    const periodSD = periodNetProfit * PROFIT_RATIO.SD;
    const periodKM = periodNetProfit * PROFIT_RATIO.KM;

    const allTimeNetProfit = calcProfit(allTimeProfitItems) - expenses.reduce((s, ex) => s + Number(ex.amount || 0), 0);
    const allTimeSDProfit = allTimeNetProfit * PROFIT_RATIO.SD;
    const sdInvested = sdCapitalTx.filter(t => t.type === 'invest').reduce((s, t) => s + Number(t.amount || 0), 0);
    const sdWithdrawn = sdCapitalTx.filter(t => t.type === 'withdraw').reduce((s, t) => s + Number(t.amount || 0), 0);
    const sdAccumulatedCapital = sdInvested - sdWithdrawn + allTimeSDProfit;

    // ═══════════ CHART DATA ═══════════
    // Group by Month (MM/YYYY)
    const monthlyMap = new Map<string, number>();
    dailyRevenue.forEach(o => {
        const key = dayjs(o.sale_date).format('MM/YYYY');
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + Number(o.total_amount || 0));
    });
    // Sort chronically 
    const sortedMonths = Array.from(monthlyMap.keys()).sort((a, b) => {
        const [ma, ya] = a.split('/');
        const [mb, yb] = b.split('/');
        return new Date(Number(ya), Number(ma) - 1).getTime() - new Date(Number(yb), Number(mb) - 1).getTime();
    });
    const barChartData = sortedMonths.map(month => ({ month, revenue: monthlyMap.get(month)! }));

    const hasPieData = periodSD > 0 || periodKM > 0;
    const pieData = [
        { name: PARTNER_NAMES.SD, value: Math.max(0, periodSD) },
        { name: PARTNER_NAMES.KM, value: Math.max(0, periodKM) },
    ];

    const slowMoving = inventory
        .filter(m => m.status === 'in_stock' && m.receive_date)
        .map(m => ({ ...m, daysInStock: dayjs().diff(dayjs(m.receive_date), 'day') }))
        .filter(m => m.daysInStock >= 30)
        .sort((a, b) => b.daysInStock - a.daysInStock)
        .slice(0, 5);

    const inStockCount = inventory.filter(m => m.status === 'in_stock').length;
    const inStockCapital = inventory
        .filter(m => m.status === 'in_stock')
        .reduce((sum, m) => sum + Number(m.purchase_price || 0) + Number(m.additional_cost || 0), 0);

    return (
        <div className="dashboard">
            <div className="dashboard-content">

                {/* ══════ HEADER ══════ */}
                <div className="dashboard-header">

                </div>

                {/* ══════ SECTION 1: KPI ══════ */}
                <div className="glass-card section-gap" style={{ padding: '24px 32px' }}>
                    <h3 className="card-title" style={{ fontSize: 18, marginBottom: 24, color: '#86868b' }}>Kết Quả Kinh Doanh</h3>
                    <div className="metric-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 32 }}>
                        <div className="metric-item">
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>Vốn Tích Lũy</div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: '#0b56c7ff' }}>{fmtFull(sdAccumulatedCapital)}</div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Đã Rút: {fmtMoney(sdWithdrawn)}
                            </div>
                        </div>
                        <div className="metric-item" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 32 }}>
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>Lợi Nhuận Gộp</div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: periodGrossProfit >= 0 ? '#34C759' : '#FF3B30' }}>{fmtFull(periodGrossProfit)}</div>
                            <div className={`trend-pill ${periodGrossProfit >= 0 ? 'trend-positive' : 'trend-negative'}`} style={{ marginTop: 12, display: 'inline-block' }}>
                                Biên lãi: {periodRevenue ? ((periodGrossProfit / periodRevenue) * 100).toFixed(1) : 0}%
                            </div>
                        </div>
                        <div className="metric-item" style={{ borderLeft: '1px solid rgba(0,0,0,0.06)', paddingLeft: 32 }}>
                            <div className="metric-label" style={{ fontSize: 14, color: '#86868b', marginBottom: 8, fontWeight: 500 }}>Lợi Nhuận Ròng</div>
                            <div className="metric-value" style={{ fontSize: 36, fontWeight: 600, letterSpacing: '-1px', color: periodNetProfit >= 0 ? '#0A84FF' : '#FF3B30' }}>{fmtFull(periodNetProfit)}</div>
                            <div className="trend-pill" style={{ marginTop: 12, display: 'inline-block', background: 'rgba(0,0,0,0.04)', color: '#86868b' }}>
                                Tổng Chi Phí: {fmtMoney(periodExpenses)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════ SECTION 2: CHART + PROFIT SPLIT ══════ */}
                <div className="grid-2 section-gap">

                    {/* Bar Chart */}
                    <div className="glass-card" ref={chartRef}>
                        <h3 className="card-title" style={{ fontSize: 18, marginBottom: 24, color: '#86868b' }}>Doanh Thu Hàng Tháng</h3>
                        {barChartData.length === 0 ? (
                            <div style={{ color: '#86868b', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
                                Không có dữ liệu
                            </div>
                        ) : (
                            <BarChart width={Math.max(chartWidth - 56, 200)} height={200} data={barChartData}
                                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b' }} />
                                <YAxis axisLine={false} tickLine={false} tickFormatter={fmtMoney} tick={{ fontSize: 11, fill: '#86868b' }} width={55} />
                                <Tooltip formatter={(value: any) => [fmtFull(value), 'Doanh thu']}
                                    contentStyle={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e5e5ea', borderRadius: 12, fontSize: 13 }}
                                    cursor={{ fill: 'rgba(0,0,0,0.03)' }} />
                                <Bar dataKey="revenue" fill="#0A84FF" radius={[6, 6, 0, 0]} barSize={barChartData.length <= 3 ? 50 : undefined} />
                            </BarChart>
                        )}
                    </div>

                    {/* Profit Split */}
                    <div className="glass-card">
                        <h3 className="card-title" style={{ fontSize: 18, marginBottom: 24, color: '#86868b' }}>Phân Bổ Lợi Nhuận</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap', padding: '16px 0' }}>
                            <PieChart width={140} height={140}>
                                {hasPieData ? (
                                    <Pie data={pieData} cx={70} cy={70} innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                                    </Pie>
                                ) : (
                                    <Pie data={[{ value: 1 }]} cx={70} cy={70} innerRadius={45} outerRadius={65} dataKey="value" stroke="none">
                                        <Cell fill="#e5e5ea" />
                                    </Pie>
                                )}
                            </PieChart>

                            <div style={{ flex: 1, minWidth: 140 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: COLORS[0], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, boxShadow: '0 4px 12px rgba(10,132,255,0.3)' }}>SĐ</div>
                                    <div>
                                        <div style={{ fontSize: 13, color: '#86868b', fontWeight: 500 }}>{PARTNER_NAMES.SD}</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.5px' }}>{fmtFull(periodSD)}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: COLORS[1], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0, boxShadow: '0 4px 12px rgba(94,92,230,0.3)' }}>KM</div>
                                    <div>
                                        <div style={{ fontSize: 13, color: '#86868b', fontWeight: 500 }}>{PARTNER_NAMES.KM}</div>
                                        <div style={{ fontSize: 24, fontWeight: 600, color: '#1d1d1f', letterSpacing: '-0.5px' }}>{fmtFull(periodKM)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ══════ SECTION 3: TỒN KHO ══════ */}
                <div className="grid-2 section-gap">
                    {/* Tổng Vốn Tồn Kho */}
                    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '32px' }}>
                        <div style={{ fontSize: 16, color: '#86868b', fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                            TỔNG VỐN ĐANG TỒN KHO
                        </div>
                        <div style={{ fontSize: 40, fontWeight: 700, color: '#1d1d1f', letterSpacing: '-1px' }}>
                            {fmtFull(inStockCapital)}
                        </div>
                        <div style={{ fontSize: 14, color: '#0A84FF', marginTop: 12, fontWeight: 500, background: 'rgba(10,132,255,0.1)', padding: '6px 12px', borderRadius: 20 }}>
                            Đang có {inStockCount} máy chờ bán
                        </div>
                    </div>

                    {/* Slow Stock */}
                    <div className="glass-card">
                        <h3 className="card-title" style={{ color: '#FF3B30', display: 'flex', alignItems: 'center', gap: 8 }}>
                            MÁY TỒN KHO LÂU NGÀY
                        </h3>
                        {slowMoving.length === 0 ? (
                            <div style={{ color: '#86868b', fontSize: 14, padding: '24px 0' }}></div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'left', color: '#86868b', fontSize: 12 }}>
                                        <th style={{ paddingBottom: 8, fontWeight: 500 }}>Sản Phẩm</th>
                                        <th style={{ paddingBottom: 8, fontWeight: 500, textAlign: 'right' }}>Thời Gian</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {slowMoving.map((m, i) => (
                                        <tr key={m.id} style={{ borderBottom: i === slowMoving.length - 1 ? 'none' : '1px solid rgba(0,0,0,0.04)' }}>
                                            <td style={{ padding: '12px 0', fontSize: 14, fontWeight: 500, color: '#1d1d1f' }}>
                                                {getFullName(m.models)}
                                                {m.serial && <div style={{ fontSize: 12, color: '#86868b', fontWeight: 400, marginTop: 4 }}>SN: {m.serial}</div>}
                                            </td>
                                            <td style={{ padding: '12px 0', textAlign: 'right' }}>
                                                <Tag color="volcano" style={{ borderRadius: 12, margin: 0, padding: '2px 8px', fontWeight: 600 }}>{m.daysInStock} ngày</Tag>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
