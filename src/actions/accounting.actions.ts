'use server';

import { AccountingRepo } from '@/repositories/accounting.repo';
import { revalidatePath } from 'next/cache';
import { logAudit } from './pos.actions';

// ═══════════ CHI PHÍ VẬN HÀNH ═══════════
export async function fetchExpensesAction() {
    try {
        return { success: true, data: await AccountingRepo.getAllExpenses() };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createExpenseAction(formData: { title: string; amount: number; expense_date: string; actor_email?: string }) {
    try {
        if (!formData.title || formData.title.trim().length < 2) throw new Error('Tiêu đề chi phí quá ngắn!');
        if (!formData.amount || formData.amount <= 0) throw new Error('Số tiền phải lớn hơn 0!');
        if (!formData.expense_date) throw new Error('Vui lòng chọn ngày phát sinh!');

        await AccountingRepo.createExpense({
            title: formData.title.trim(),
            amount: formData.amount,
            expense_date: formData.expense_date,
        });

        await logAudit(formData.actor_email || 'Hệ Thống', 'CREATE', 'general_expenses', 'N/A', `Tạo chi phí mới: ${formData.title.trim()} (${formData.amount.toLocaleString()} đ)`);

        revalidatePath('/accounting');
        return { success: true, message: 'Đã thêm chi phí!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteExpenseAction(id: string, actor: string) {
    try {
        if (!id) throw new Error('Thiếu ID chi phí!');
        await AccountingRepo.deleteExpense(id);

        await logAudit(actor, 'DELETE', 'general_expenses', id, `Xóa chi phí (ID: ${id})`);

        revalidatePath('/accounting');
        return { success: true, message: 'Đã xóa chi phí!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// ═══════════ VỐN GÓP ═══════════
export async function fetchCapitalAction() {
    try {
        return { success: true, data: await AccountingRepo.getAllCapitalTransactions() };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function createCapitalAction(formData: { investor: string; type: string; amount: number; note: string; transaction_date: string; actor_email?: string }) {
    try {
        if (!formData.investor || formData.investor.trim().length < 2) throw new Error('Tên nhà đầu tư quá ngắn!');
        if (!formData.amount || formData.amount <= 0) throw new Error('Số tiền phải lớn hơn 0!');
        if (!formData.type) throw new Error('Vui lòng chọn loại giao dịch!');
        if (!formData.transaction_date) throw new Error('Vui lòng chọn ngày giao dịch!');

        await AccountingRepo.createCapitalTransaction({
            investor: formData.investor.trim(),
            type: formData.type,
            amount: formData.amount,
            note: formData.note?.trim() || '',
            transaction_date: formData.transaction_date,
        });

        await logAudit(formData.actor_email || 'Hệ Thống', 'CREATE', 'capital_transactions', 'N/A', `Tạo giao dịch vốn: ${formData.type} ${formData.amount.toLocaleString()} đ (Bởi: ${formData.investor.trim()})`);

        revalidatePath('/accounting');
        return { success: true, message: 'Đã thêm giao dịch vốn!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function deleteCapitalAction(id: string, actor: string) {
    try {
        if (!id) throw new Error('Thiếu ID giao dịch!');
        await AccountingRepo.deleteCapitalTransaction(id);

        await logAudit(actor, 'DELETE', 'capital_transactions', id, `Xóa giao dịch vốn (ID: ${id})`);

        revalidatePath('/accounting');
        return { success: true, message: 'Đã xóa giao dịch vốn!' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}
