'use server';

import { WarrantyRepo } from '@/repositories/warranty.repo';
import { revalidatePath } from 'next/cache';

export async function fetchWarrantyLogsAction() {
    try {
        return { success: true, data: await WarrantyRepo.getAllWarrantyLogs() };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function fetchActiveWarrantyItemsAction() {
    try {
        return { success: true, data: await WarrantyRepo.getActiveWarrantyItems() };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createWarrantyLogAction(formData: {
    order_item_id: string;
    receive_date: string;
    issue_description: string;
    note?: string;
}) {
    try {
        if (!formData.order_item_id) throw new Error('Thiếu mã sản phẩm!');
        if (!formData.issue_description || formData.issue_description.trim().length < 5) throw new Error('Mô tả lỗi quá ngắn (tối thiểu 5 ký tự)!');
        if (!formData.receive_date) throw new Error('Vui lòng chọn ngày nhận máy bảo hành!');

        await WarrantyRepo.createWarrantyLog({
            order_item_id: formData.order_item_id,
            receive_date: formData.receive_date,
            issue_description: formData.issue_description.trim(),
            note: formData.note?.trim() || undefined,
        });
        revalidatePath('/warranty');
        return { success: true, message: 'Đã tạo phiếu bảo hành!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateWarrantyLogAction(id: string, updateData: { return_date?: string; note?: string }) {
    try {
        if (!id) throw new Error('Thiếu ID phiếu bảo hành!');
        await WarrantyRepo.updateWarrantyLog(id, updateData);
        revalidatePath('/warranty');
        return { success: true, message: 'Đã cập nhật phiếu bảo hành!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
