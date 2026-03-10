'use server';

import { InventoryRepo } from '@/repositories/inventory.repo';
import { revalidatePath } from 'next/cache';
import { sendTelegramMessage } from '@/lib/telegram';
import { logAudit } from './pos.actions';

const toTitleCase = (str: string) => {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

const normalizeSpecs = (str: string) => {
  if (!str) return '';
  return str.trim().toUpperCase().replace(/\s+/g, '');
};

export async function fetchInventoryAction() {
  try { return { success: true, data: await InventoryRepo.getAllInventory() }; }
  catch (error: any) { return { success: false, message: error.message }; }
}

export async function fetchModelsAction() {
  try { return { success: true, data: await InventoryRepo.getAllModels() }; }
  catch (error: any) { return { success: false, message: error.message }; }
}

export async function createModelAction(formData: any) {
  try {
    // Validation
    if (!formData.brand || formData.brand.trim().length < 1) throw new Error('Thiếu tên Hãng!');
    if (!formData.name || formData.name.trim().length < 1) throw new Error('Thiếu tên Máy!');

    const specsJson = { cpu: formData.cpu?.trim() || '', ram: normalizeSpecs(formData.ram), storage: normalizeSpecs(formData.storage), battery: formData.battery?.trim() || '', mdm: formData.mdm || false };
    const modelData = { category: formData.category || 'Laptop', brand: toTitleCase(formData.brand), name: toTitleCase(formData.name), specs: specsJson };
    await InventoryRepo.createModel(modelData);
    
    // Ghi log (sẽ không có record_id trả về, nên để 'N/A')
    await logAudit(formData.actor_email || 'Hệ Thống', 'CREATE', 'models', 'N/A', `Tạo dòng máy mới: ${modelData.brand} ${modelData.name}`);

    revalidatePath('/inventory');
    return { success: true, message: 'Đã tạo Dòng máy mới!' };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function importInventoryAction(modelId: string, quantity: number, formData: any, actor: string) {
  try {
    // Validation
    if (!modelId) throw new Error('Chưa chọn Dòng máy!');
    if (!quantity || quantity < 1 || quantity > 50) throw new Error('Số lượng nhập phải từ 1-50!');

    const itemsToInsert = [];
    const currentTime = new Date().toISOString();
    let totalValue = 0;

    for (let i = 0; i < quantity; i++) {
      const serial = formData[`serial_${i}`]?.trim().toUpperCase() || null;
      const price = Number(formData[`price_${i}`]) || 0;
      const addCost = Number(formData[`additional_cost_${i}`]) || 0;

      if (price < 0) throw new Error(`Giá nhập máy ${i + 1} không được âm!`);
      if (addCost < 0) throw new Error(`Phí phát sinh máy ${i + 1} không được âm!`);

      const status = serial ? 'in_stock' : 'in_transit';
      totalValue += (price + addCost);

      itemsToInsert.push({
        model_id: modelId, serial: serial, purchase_price: price, additional_cost: addCost,
        status: status, order_date: currentTime, receive_date: serial ? currentTime : null
      });
    }

    await InventoryRepo.importMultipleInventory(itemsToInsert);

    // Ghi log tổng cộng
    await logAudit(actor, 'CREATE', 'inventory', modelId, `Nhập mới ${quantity} máy. Tổng vốn: ${totalValue.toLocaleString()} đ`);

    // 📢 BÁO CÁO TELEGRAM KHI NHẬP HÀNG
    sendTelegramMessage(`📦 <b>[NHẬP KHO]</b> Vừa Order/Nhập ${quantity} máy mới.\n👤 Người nhập: <b>${actor}</b>\n💰Tổng Vốn: <b>${totalValue.toLocaleString()} VNĐ</b>`);

    revalidatePath('/inventory');
    return { success: true, message: `Đã nhập ${quantity} máy thành công!` };
  } catch (error: any) { return { success: false, message: error.message }; }
}

export async function updateInventoryAction(id: string, updateData: any, actor: string) {
  try {
    if (!id) throw new Error('Thiếu ID máy!');

    const finalData = { ...updateData };
    if (finalData.serial) finalData.serial = finalData.serial.trim().toUpperCase();
    if (finalData.purchase_price !== undefined && Number(finalData.purchase_price) < 0) throw new Error('Giá nhập không được âm!');

    // Dates are already included via ...updateData, passed from the frontend as ISO strings or null.

    await InventoryRepo.updateInventory(id, finalData);

    // Fetch full details for the Telegram message
    const item = await InventoryRepo.getInventoryItemWithModel(id);
    const machineName = `${item.models?.brand} ${item.models?.name}`.trim();

    // 📢 BÁO CÁO TELEGRAM KHI SỬA HOẶC BÁN
    let actionText = "Cập nhật thông tin";
    let logAction = 'UPDATE';
    if (finalData.status === 'sold') { actionText = "💰 Đã Bán / Xuất Hủy"; logAction = 'SELL'; }
    if (finalData.status === 'defective') { actionText = "🛠️ Báo Lỗi"; logAction = 'UPDATE'; }

    await logAudit(actor, logAction, 'inventory', id, `${actionText} máy ${machineName} (Serial: ${item.serial || 'N/A'})`);
    sendTelegramMessage(`🔄 <b>[${actionText}]</b>\n💻 Máy: <b>${machineName}</b>\n🆔 Serial: <code>${item.serial || 'N/A'}</code>\n👤 Người thao tác: <b>${actor}</b>\n💰 Giá vốn hiện tại: <b>${item.purchase_price?.toLocaleString() || 0} đ</b>`);

    revalidatePath('/inventory');
    return { success: true };
  } catch (error: any) { return { success: false, message: error.message }; }
}


export async function deleteInventoryAction(id: string, actor: string) {
  try {
    if (!id) throw new Error('Thiếu ID máy!');
    if (!actor) throw new Error('Không xác định được người thao tác!');

    // Fetch details before deletion
    const item = await InventoryRepo.getInventoryItemWithModel(id);
    const machineName = `${item.models?.brand} ${item.models?.name}`.trim();
    const machineSerial = item.serial || 'N/A';

    const result = await InventoryRepo.deleteOrArchiveInventory(id);

    if (result === 'deleted') {
      await logAudit(actor, 'DELETE', 'inventory', id, `Xóa vĩnh viễn máy ${machineName} (Serial: ${machineSerial})`);
      await sendTelegramMessage(`🚨 <b>[XÓA VĨNH VIỄN]</b>\n💻 Máy: <b>${machineName}</b>\n🆔 Serial: <code>${machineSerial}</code>\n👤 Thủ phạm: <b>${actor}</b> vừa Phi tang 1 máy chưa bán!\n(ID hệ thống: <code>${id}</code>)`).catch(console.error);
      return { success: true, message: 'Máy chưa bán. Đã xóa vĩnh viễn khỏi kho!' };
    } else {
      await logAudit(actor, 'DELETE', 'inventory', id, `Chuyển máy đã bán ${machineName} (Serial: ${machineSerial}) vào Thùng rác/Lưu trữ`);
      await sendTelegramMessage(`🚨 <b>[LƯU TRỮ VÀO THÙNG RÁC]</b>\n💻 Máy: <b>${machineName}</b>\n🆔 Serial: <code>${machineSerial}</code>\n👤 <b>${actor}</b> vừa Lưu Trữ máy đã bán.\n(ID hệ thống: <code>${id}</code>)`).catch(console.error);
      return { success: true, message: 'Máy đã có bill kế toán. Đã tống vào Thùng rác (Lưu Trữ)!' };
    }
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}