'use server';

import { supabase } from '@/lib/supabase';
import { sendTelegramMessage } from '@/lib/telegram';
import { revalidatePath } from 'next/cache';

export async function logAudit(actorEmail: string, action: string, tableName: string, recordId: string, desc: string) {
  await supabase.from('audit_logs').insert({ 
    actor_email: actorEmail, 
    action, 
    table_name: tableName, 
    new_data: { record_id: recordId, description: desc } 
  });
}

// 🕵️ HÀM DÒ KHÁCH QUEN BẰNG SỐ ĐIỆN THOẠI
export async function getCustomerByPhoneAction(phone: string) {
  try {
    if (!phone || phone.trim().length < 10) return { success: false, message: 'SĐT không hợp lệ!' };
    const { data } = await supabase.from('customers').select('*').eq('phone', phone.trim()).single();
    if (data) return { success: true, data };
    return { success: false };
  } catch (error) { return { success: false }; }
}

// 💰 HÀM CHỐT ĐƠN (NHIỀU MÁY) — CÓ ROLLBACK + VALIDATION
export async function checkoutOrderAction(payload: any) {
  try {
    const { phone, full_name, facebook, actor_email, cartItems, marketing_source } = payload;

    // ══════════════ VALIDATION ══════════════
    if (!cartItems || cartItems.length === 0) throw new Error('Giỏ hàng đang trống!');
    if (!phone || phone.trim().length < 10) throw new Error('SĐT khách hàng không hợp lệ (tối thiểu 10 ký tự)!');
    if (!full_name || full_name.trim().length < 2) throw new Error('Tên khách hàng quá ngắn!');
    if (!actor_email) throw new Error('Không xác định được người bán!');

    for (const item of cartItems) {
      if (!item.inventory_id) throw new Error('Có máy thiếu mã inventory!');
      if (!item.sale_price || Number(item.sale_price) <= 0) throw new Error(`Giá bán của máy "${item.model_name}" phải lớn hơn 0!`);
      const wDays = Number(item.warranty_days || 0);
      if (wDays < 0) throw new Error('Số ngày bảo hành không hợp lệ!');
    }

    // ══════════════ KIỂM TRA TỒN KHO TRƯỚC ══════════════
    const inventoryIds = cartItems.map((item: any) => item.inventory_id);
    const { data: stockCheck, error: stockErr } = await supabase
      .from('inventory')
      .select('id, status')
      .in('id', inventoryIds);

    if (stockErr) throw new Error('Lỗi kiểm tra tồn kho: ' + stockErr.message);

    const unavailable = stockCheck?.filter(m => m.status !== 'in_stock') || [];
    if (unavailable.length > 0) {
      throw new Error(`Có ${unavailable.length} máy không còn ở trạng thái "Còn Hàng". Vui lòng tải lại trang!`);
    }

    // ══════════════ 1. CRM: TÌM HOẶC TẠO KHÁCH HÀNG ══════════════
    let customerId = '';
    const { data: existingCustomer } = await supabase.from('customers').select('id, facebook').eq('phone', phone.trim()).single();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Cập nhật lại facebook nếu trước đó chưa có mà bây giờ khách hàng cung cấp
      if (facebook && facebook.trim() !== '' && (!existingCustomer.facebook || existingCustomer.facebook.trim() === '')) {
        await supabase.from('customers').update({ facebook: facebook.trim() }).eq('id', customerId);
      }
    } else {
      const { data: newCustomer, error: cusErr } = await supabase.from('customers').insert({
        phone: phone.trim(),
        full_name: full_name.trim(),
        name: full_name.trim(),
        facebook: facebook ? facebook.trim() : null
      }).select('id').single();
      if (cusErr) throw new Error('Lỗi tạo khách hàng: ' + cusErr.message);
      customerId = newCustomer.id;
    }

    // ══════════════ 2. TÍNH TỔNG TIỀN ══════════════
    const totalAmount = cartItems.reduce((sum: number, item: any) => sum + Number(item.sale_price), 0);

    // ══════════════ 3. TẠO ĐƠN HÀNG CHÍNH ══════════════
    const { data: order, error: orderErr } = await supabase.from('orders').insert({
      customer_id: customerId,
      total_amount: totalAmount,
      seller_email: actor_email,
      marketing_source: marketing_source || 'Chưa rõ'
    }).select('id').single();
    if (orderErr) throw new Error('Lỗi tạo đơn: ' + orderErr.message);

    // ══════════════ 4. LƯU CHI TIẾT TỪNG MÁY VÀO order_items ══════════════
    const orderItemsToInsert = cartItems.map((item: any) => {
      const warrantyExpires = new Date();
      warrantyExpires.setDate(warrantyExpires.getDate() + Number(item.warranty_days || 0));
      return {
        order_id: order.id,
        inventory_id: item.inventory_id,
        sale_price: Number(item.sale_price),
        historical_cost: Number(item.cost_price || 0),  // Lưu giá vốn gốc để tính lãi sau
        warranty_end_date: warrantyExpires.toISOString(),
        status: 'sold',
      };
    });

    const { error: itemErr } = await supabase.from('order_items').insert(orderItemsToInsert);
    if (itemErr) {
      // ROLLBACK: Xóa order vừa tạo
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Lỗi lưu chi tiết đơn: ' + itemErr.message);
    }

    // ══════════════ 5. CẬP NHẬT KHO → "ĐÃ BÁN" ══════════════
    const { error: invErr } = await supabase.from('inventory').update({ status: 'sold' }).in('id', inventoryIds);
    if (invErr) {
      // ROLLBACK: Xóa order_items và order vừa tạo
      await supabase.from('order_items').delete().eq('order_id', order.id);
      await supabase.from('orders').delete().eq('id', order.id);
      throw new Error('Lỗi cập nhật kho! Đơn hàng đã được rollback tự động.');
    }

    // ══════════════ 6. GHI LOG KIỂM TOÁN ══════════════
    await logAudit(actor_email, 'SELL', 'orders', order.id, `Bán ${cartItems.length} máy cho ${phone}. Tổng: ${totalAmount.toLocaleString()}đ`);

    // ══════════════ 7. BÁO CÁO TELEGRAM ══════════════
    const msgDetails = cartItems.map((i: any) => `- ${i.model_name} (SN: <code>${i.serial}</code>) : ${Number(i.sale_price).toLocaleString()}đ`).join('\n');
    const msg = `🚀 <b>[CHỐT ĐƠN] ${marketing_source !== 'Chưa rõ' ? `[${marketing_source}]` : ''}</b>\n👤 Sale: <b>${actor_email}</b>\n👨‍💼 Khách: ${full_name} (${phone})\n🛒 Đã chốt ${cartItems.length} máy:\n${msgDetails}\n💰 <b>TỔNG THU: ${totalAmount.toLocaleString()} VNĐ</b>`;
    sendTelegramMessage(msg).catch(console.error);

    revalidatePath('/pos');
    revalidatePath('/inventory');
    return {
      success: true,
      message: `Thành công! Đã thu ${totalAmount.toLocaleString()} đ`,
      orderId: order.id,
      timestamp: new Date().toISOString()
    };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}