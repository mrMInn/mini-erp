import React from 'react';
import { fetchOrdersAction } from '@/actions/orders.actions';
import OrdersClient from './OrdersClient';
import { Alert } from 'antd';

export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
    const res = await fetchOrdersAction();

    if (!res.success) {
        return <Alert message="Lỗi tải đơn hàng" description={(res as any).message} type="error" style={{ margin: 32 }} />;
    }

    return <OrdersClient ordersData={res.data || []} />;
}
