export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  role: 'admin' | 'staff';
}

export interface Model {
  id: string;
  category: string;
  brand: string;
  name: string;
  specs: any;
}

export interface Inventory {
  id: string;
  model_id: string;
  tracking_code?: string;
  serial?: string;
  purchase_price: number;
  additional_cost: number;
  status: string;
  order_date: string;
  receive_date?: string;
  is_deleted: boolean;
  deleted_at?: string;
  deleted_by?: string;
  models?: Model;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  link_fb?: string;
  full_name?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  inventory_id: string;
  sale_price: number;
  accessory_fee: number;
  historical_cost: number;
  warranty_end_date: string | null;
  refund_fee: number;
  status: string;
  created_at: string;
  inventory?: Inventory;
}

export interface Order {
  id: string;
  customer_id: string;
  total_amount: number;
  seller_email?: string;
  sale_date: string;
  customers?: Customer;
  order_items?: OrderItem[];
}

export interface OrderEditRequest {
  id: string;
  order_item_id: string;
  requested_by: string;
  new_sale_price?: number;
  new_accessory_fee?: number;
  new_warranty_end_date?: string;
  reason?: string;
  status: string;
  resolved_by?: string;
  created_at: string;
  resolved_at?: string;
  order_items?: OrderItem;
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  expense_date: string;
  created_by?: string;
  created_at?: string;
}

export interface CapitalTransaction {
  id: string;
  investor: string;
  type: string;
  amount: number;
  note: string;
  transaction_date: string;
  created_at?: string;
}

export interface WarrantyLog {
  id: string;
  order_item_id: string;
  receive_date: string;
  return_date?: string;
  issue_description: string;
  note?: string;
  created_by?: string;
  created_at?: string;
  order_items?: OrderItem;
}