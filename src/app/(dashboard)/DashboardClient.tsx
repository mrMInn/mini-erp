'use client';

import React, { useRef, useState, useEffect } from 'react';
import { Tag } from 'antd';
import { PROFIT_RATIO, PARTNER_NAMES } from '@/constants';
import dayjs from 'dayjs';
import { getFullName } from '@/utils/helpers';
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import { SearchOutlined } from '@ant-design/icons';
import './dashboard.css';

const COLORS = ['#FF9500', '#5E5CE6']; 

const fmtMoney = (v: number) => {
    if (v === 0) return '0đ';
    const abs = Math.abs(v);
    const sign = v < 0 ? '-' : '';
    if (abs >= 1_000_000_000) {
        const val = abs / 1_000_000_000;
        return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}tỷ`;
    }
    if (abs >= 1_000_000) {
        const val = abs / 1_000_000;
        return `${sign}${val % 1 === 0 ? val.toFixed(0) : val.toFixed(1)}tr`;
    }
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

    // Growth calculation for Option 1
    const lastMonthRev = barChartData.length >= 2 ? barChartData[barChartData.length - 2].revenue : 0;
    const currentMonthRev = barChartData.length >= 1 ? barChartData[barChartData.length - 1].revenue : 0;
    const growthPercent = lastMonthRev > 0 ? ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;

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

                {/* ══════ SECTION 1: KPI CARDS ══════ */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
                    {/* Vốn Tích Lũy */}
                    <div className="glass-card" style={{ 
                        background: 'rgba(0, 122, 255, 0.05)', 
                        border: '1px solid rgba(0, 122, 255, 0.1)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        minHeight: '140px',
                        padding: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vốn Tích Lũy</div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#007AFF', letterSpacing: '-1px' }}>{fmtFull(sdAccumulatedCapital)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#86868b' }}>
                            Đã Rút: <span style={{ fontWeight: 600 }}>{fmtMoney(sdWithdrawn)}</span>
                        </div>
                    </div>

                    {/* Lợi Nhuận Gộp */}
                    <div className="glass-card" style={{ 
                        background: 'rgba(52, 199, 89, 0.05)', 
                        border: '1px solid rgba(52, 199, 89, 0.1)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        minHeight: '140px',
                        padding: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lợi Nhuận Gộp</div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#34C759', letterSpacing: '-1px' }}>{fmtFull(periodGrossProfit)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#86868b' }}>
                            Biên lãi: <span style={{ fontWeight: 600, color: '#34C759' }}>{periodRevenue ? ((periodGrossProfit / periodRevenue) * 100).toFixed(1) : 0}%</span>
                        </div>
                    </div>

                    {/* Lợi Nhuận Ròng */}
                    <div className="glass-card" style={{ 
                        background: 'rgba(94, 92, 230, 0.05)', 
                        border: '1px solid rgba(94, 92, 230, 0.1)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        minHeight: '140px',
                        padding: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lợi Nhuận Ròng</div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#5E5CE6', letterSpacing: '-1px' }}>{fmtFull(periodNetProfit)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#86868b' }}>
                            Tổng Chi Phí: <span style={{ fontWeight: 600 }}>{fmtMoney(periodExpenses)}</span>
                        </div>
                    </div>
                </div>

                {/* ══════ SECTION 2: CHART + PROFIT SPLIT ══════ */}
                <div className="grid-2 section-gap">

                    {/* Area Chart (Option 1) - Cardified */}
                    <div className="glass-card" ref={chartRef} style={{ 
                        position: 'relative',
                        background: 'rgba(10, 132, 255, 0.05)', 
                        border: '1px solid rgba(10, 132, 255, 0.1)',
                        padding: '24px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Doanh Thu Hàng Tháng</div>
                            </div>
                            {barChartData.length >= 2 && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 4, 
                                    padding: '4px 10px', 
                                    borderRadius: '12px',
                                    background: growthPercent >= 0 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255, 59, 48, 0.1)',
                                    color: growthPercent >= 0 ? '#34C759' : '#FF3B30',
                                    fontSize: 13,
                                    fontWeight: 600
                                }}>
                                    {growthPercent >= 0 ? '↑' : '↓'}
                                    {Math.abs(growthPercent).toFixed(1)}%
                                </div>
                            )}
                        </div>
                        
                        {barChartData.length === 0 ? (
                            <div style={{ color: '#86868b', fontSize: 14, padding: '40px 0', textAlign: 'center' }}>
                                Không có dữ liệu
                            </div>
                        ) : (
                            <div style={{ width: '100%', height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={barChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#0A84FF" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#0A84FF" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#86868b' }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tickFormatter={fmtMoney} tick={{ fontSize: 11, fill: '#86868b' }} />
                                        <Tooltip 
                                            formatter={(value: any) => [fmtFull(value), 'Doanh thu']}
                                            contentStyle={{ background: 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 13 }}
                                            labelStyle={{ fontWeight: 600, marginBottom: 4 }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="revenue" 
                                            stroke="#0A84FF" 
                                            strokeWidth={3}
                                            fillOpacity={1} 
                                            fill="url(#colorRev)" 
                                            animationDuration={1500}
                                            dot={{ r: 4, fill: '#0A84FF', strokeWidth: 2, stroke: '#fff' }}
                                            activeDot={{ r: 6, strokeWidth: 0 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Profit Split - Replaced with Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                        <div className="glass-card" style={{ 
                            background: 'rgba(255, 149, 0, 0.1)', 
                            border: '1px solid rgba(255, 149, 0, 0.2)',
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center',
                            minHeight: '140px' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#FF9500', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>SĐ</div>
                                <div style={{ fontSize: 14, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{PARTNER_NAMES.SD}</div>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: '#FF9500', letterSpacing: '-1px' }}>{fmtFull(periodSD)}</div>
                        </div>

                        <div className="glass-card" style={{ 
                            background: 'rgba(94, 92, 230, 0.1)', 
                            border: '1px solid rgba(94, 92, 230, 0.2)',
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'center',
                            minHeight: '140px' 
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#5E5CE6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12 }}>KM</div>
                                <div style={{ fontSize: 14, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{PARTNER_NAMES.KM}</div>
                            </div>
                            <div style={{ fontSize: 32, fontWeight: 700, color: '#5E5CE6', letterSpacing: '-1px' }}>{fmtFull(periodKM)}</div>
                        </div>
                    </div>
                </div>

                {/* ══════ SECTION 3: INVENTORY CARDS ══════ */}
                <div className="grid-2 section-gap">
                    {/* Tổng Vốn Tồn Kho */}
                    <div className="glass-card" style={{ 
                        background: 'rgba(255, 45, 85, 0.05)', 
                        border: '1px solid rgba(255, 45, 85, 0.1)',
                        display: 'flex', 
                        flexDirection: 'column', 
                        justifyContent: 'center',
                        minHeight: '140px',
                        padding: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                            <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tổng Vốn Tồn Kho</div>
                        </div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: '#FF2D55', letterSpacing: '-1px' }}>{fmtFull(inStockCapital)}</div>
                        <div style={{ marginTop: 8, fontSize: 13, color: '#86868b' }}>
                            Số lượng: <span style={{ fontWeight: 600 }}>{inStockCount} máy chờ bán</span>
                        </div>
                    </div>

                    {/* Slow Stock Card */}
                    <div className="glass-card" style={{ 
                        background: 'rgba(255, 59, 48, 0.05)', 
                        border: '1px solid rgba(255, 59, 48, 0.1)',
                        padding: '24px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ fontSize: 13, color: '#86868b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Máy Tồn Kho Lâu Ngày ({'>'}30 ngày)</div>
                        </div>
                        
                        {slowMoving.length === 0 ? (
                            <div style={{ color: '#86868b', fontSize: 14, padding: '10px 0' }}>Không có máy tồn lâu</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {slowMoving.map((m) => (
                                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 8, borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                                        <div>
                                            <div style={{ fontSize: 14, fontWeight: 600, color: '#1d1d1f' }}>{getFullName(m.models)}</div>
                                            {m.serial && <div style={{ fontSize: 12, color: '#86868b' }}>SN: {m.serial}</div>}
                                        </div>
                                        <Tag color="volcano" style={{ borderRadius: 12, margin: 0, fontWeight: 600 }}>{m.daysInStock} ngày</Tag>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
