import { createClient } from '@/lib/supabase/server';

export class OrdersRepo {
    // Lấy tất cả đơn hàng (kèm customer + order_items + inventory + model)
    static async getAllOrders() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        customers (*),
        order_items (
          *,
          inventory (
            *,
            models (*)
          )
        )
      `)
            .order('sale_date', { ascending: false });
        if (error) throw new Error(error.message);
        return data;
    }

    // Lấy 1 đơn hàng chi tiết
    static async getOrderById(orderId: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select(`
        *,
        customers (*),
        order_items (
          *,
          inventory (
            *,
            models (*)
          )
        )
      `)
            .eq('id', orderId)
            .single();
        if (error) throw new Error(error.message);
        return data;
    }

    // Thống kê doanh thu theo khoảng thời gian
    static async getRevenueStats(startDate: string, endDate: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('id, total_amount, sale_date')
            .gte('sale_date', startDate)
            .lte('sale_date', endDate);
        if (error) throw new Error(error.message);
        return data;
    }

    // Thống kê lợi nhuận từ order_items theo khoảng thời gian
    static async getProfitStats(startDate: string, endDate: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('order_items')
            .select('id, sale_price, historical_cost, accessory_fee, refund_fee, status, created_at')
            .gte('created_at', startDate)
            .lte('created_at', endDate);
        if (error) throw new Error(error.message);
        return data;
    }

    // Lãi gộp ALL-TIME (để tính vốn tích lũy SĐ)
    static async getAllTimeProfitItems() {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('order_items')
            .select('sale_price, historical_cost, accessory_fee, refund_fee, status');
        if (error) throw new Error(error.message);
        return data;
    }

    // Doanh thu theo ngày (cho line chart)
    static async getDailyRevenue(startDate: string, endDate: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('orders')
            .select('id, total_amount, sale_date')
            .gte('sale_date', startDate)
            .lte('sale_date', endDate)
            .order('sale_date', { ascending: true });
        if (error) throw new Error(error.message);
        return data;
    }

    // Vốn góp/rút theo nhà đầu tư
    static async getCapitalByInvestor(investor: string) {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from('capital_transactions')
            .select('type, amount')
            .ilike('investor', `%${investor}%`);
        if (error) throw new Error(error.message);
        return data;
    }

    // Cập nhật order_item khi refund
    static async refundOrderItem(orderItemId: string, refundFee: number) {
        const supabase = await createClient();

        const { data: item, error: getErr } = await supabase
            .from('order_items')
            .select('inventory_id, status')
            .eq('id', orderItemId)
            .single();
        if (getErr) throw new Error(getErr.message);
        if (!item) throw new Error('Không tìm thấy chi tiết đơn hàng!');
        if (item.status === 'refunded') throw new Error('Máy này đã được hoàn trả rồi!');

        const { error: updateErr } = await supabase
            .from('order_items')
            .update({ status: 'refunded', refund_fee: refundFee })
            .eq('id', orderItemId);
        if (updateErr) throw new Error(updateErr.message);

        const { error: invErr } = await supabase
            .from('inventory')
            .update({ status: 'in_stock', is_deleted: false, deleted_at: null })
            .eq('id', item.inventory_id);
        if (invErr) {
            await supabase.from('order_items').update({ status: 'sold', refund_fee: 0 }).eq('id', orderItemId);
            throw new Error('Lỗi trả máy về kho! Đã rollback.');
        }

        return { inventoryId: item.inventory_id };
    }
}
