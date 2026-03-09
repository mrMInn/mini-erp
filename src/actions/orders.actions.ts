'use server';

import { OrdersRepo } from '@/repositories/orders.repo';
import { sendTelegramMessage } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';
import { logAudit } from './pos.actions';

export async function fetchOrdersAction() {
    try {
        return { success: true, data: await OrdersRepo.getAllOrders() };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function fetchOrderByIdAction(orderId: string) {
    try {
        if (!orderId) throw new Error('Thiếu mã đơn hàng!');
        return { success: true, data: await OrdersRepo.getOrderById(orderId) };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Dashboard: Thống kê doanh thu
export async function fetchRevenueStatsAction(startDate: string, endDate: string) {
    try {
        return { success: true, data: await OrdersRepo.getRevenueStats(startDate, endDate) };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Dashboard: Thống kê lợi nhuận
export async function fetchProfitStatsAction(startDate: string, endDate: string) {
    try {
        return { success: true, data: await OrdersRepo.getProfitStats(startDate, endDate) };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Dashboard: Lãi gộp ALL-TIME (tính vốn tích lũy SĐ)
export async function fetchAllTimeProfitAction() {
    try {
        return { success: true, data: await OrdersRepo.getAllTimeProfitItems() };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Dashboard: Doanh thu theo ngày (cho line chart)
export async function fetchDailyRevenueAction(startDate: string, endDate: string) {
    try {
        return { success: true, data: await OrdersRepo.getDailyRevenue(startDate, endDate) };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Dashboard: Vốn góp/rút của nhà đầu tư
export async function fetchCapitalByInvestorAction(investor: string) {
    try {
        return { success: true, data: await OrdersRepo.getCapitalByInvestor(investor) };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// HOÀN TRẢ MÁY
export async function refundOrderItemAction(orderItemId: string, refundFee: number, actorEmail: string) {
    try {
        if (!orderItemId) throw new Error('Thiếu mã chi tiết đơn!');
        if (refundFee < 0) throw new Error('Phí hoàn trả không được âm!');
        if (!actorEmail) throw new Error('Không xác định được người thao tác!');

        const result = await OrdersRepo.refundOrderItem(orderItemId, refundFee);

        // Log + Telegram
        await logAudit(actorEmail, 'REFUND', 'order_items', orderItemId, `Hoàn trả máy. Phí: ${refundFee.toLocaleString()}đ`);
        sendTelegramMessage(`🔄 <b>[HOÀN TRẢ]</b>\n👤 <b>${actorEmail}</b> vừa hoàn trả 1 máy về kho.\nPhí hoàn trả: <b>${refundFee.toLocaleString()} VNĐ</b>`).catch(console.error);

        revalidatePath('/orders');
        revalidatePath('/inventory');
        return { success: true, message: 'Đã hoàn trả máy về kho thành công!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
