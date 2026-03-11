'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Form, Input, InputNumber, Button, message, Tag, Space, Radio } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, DeleteOutlined, CreditCardOutlined, SearchOutlined, PhoneOutlined, UserOutlined, LinkOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { createClient } from '@/lib/supabase/client';
import { checkoutOrderAction, getCustomerByPhoneAction } from '@/actions/pos.actions';
import { getFullName } from '@/utils/helpers';
import './pos.css';

const fmtVND = (v: number) => new Intl.NumberFormat('vi-VN').format(v) + 'đ';

const formatSpecs = (specsObj: any) => {
  if (!specsObj) return null;
  const tagStyle = { border: 'none', padding: '2px 6px', fontSize: 13, fontWeight: 500 };
  return (
    <Space size={[0, 4]} wrap style={{ marginTop: 4, marginBottom: 4 }}>
      {specsObj.cpu && <Tag color="blue" style={{ ...tagStyle, background: 'rgba(10,132,255,0.1)' }}>{specsObj.cpu}</Tag>}
      {specsObj.ram && <Tag color="cyan" style={{ ...tagStyle, background: 'rgba(50,173,230,0.1)', color: '#0071a4' }}>RAM {specsObj.ram}</Tag>}
      {specsObj.storage && <Tag color="purple" style={{ ...tagStyle, background: 'rgba(175,82,222,0.1)', color: '#8944ab' }}>SSD {specsObj.storage}</Tag>}
      {specsObj.battery && <Tag color="green" style={{ ...tagStyle, background: 'rgba(52,199,89,0.1)', color: '#248a3d' }}>Pin: {specsObj.battery}</Tag>}
      {specsObj.mdm && <Tag color="red" style={{ ...tagStyle, background: 'rgba(255,59,48,0.1)', color: '#c41a12', fontWeight: 600 }}>CÓ MDM</Tag>}
    </Space>
  );
};

export default function POSPage() {
  const [form] = Form.useForm();
  const [inventory, setInventory] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>('Ẩn danh');
  const [searchText, setSearchText] = useState('');
  const [isReturning, setIsReturning] = useState(false);
  const [nameHighlight, setNameHighlight] = useState(false);
  const searchRef = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data?.user?.email) setCurrentUser(data.user.email); });
    const fetchStock = async () => {
      const { data } = await supabase.from('inventory').select('*, models(*)').eq('status', 'in_stock').eq('is_deleted', false);
      if (data) setInventory(data);
    };
    fetchStock();
    // Auto-focus search bar for barcode scanning
    setTimeout(() => searchRef.current?.focus(), 300);
  }, [supabase]);

  // 🛒 THÊM MÁY VÀO GIỎ
  const handleAddMachine = (machine: any) => {
    if (cart.some(c => c.inventory_id === machine.id)) return;
    const totalCost = Number(machine.purchase_price) + Number(machine.additional_cost || 0);
    setCart([...cart, {
      inventory_id: machine.id,
      model_name: getFullName(machine.models),
      specs: machine.models?.specs,
      serial: machine.serial || 'N/A',
      sale_price: totalCost + 2000000,
      warranty_days: undefined,
      cost_price: totalCost,
    }]);
    setSearchText('');
    searchRef.current?.focus();
  };

  const handleRemoveFromCart = (inventoryId: string) => setCart(cart.filter(item => item.inventory_id !== inventoryId));

  const updateCartItem = (inventoryId: string, field: string, value: number) => {
    setCart(cart.map(item => item.inventory_id === inventoryId ? { ...item, [field]: value || 0 } : item));
  };

  const handlePhoneBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const phone = e.target.value;
    setIsReturning(false);
    if (phone.length >= 10) {
      const res = await getCustomerByPhoneAction(phone);
      if (res.success && res.data) {
        form.setFieldsValue({ full_name: res.data.full_name, facebook: res.data.facebook });
        setIsReturning(true);
        setNameHighlight(true);
        setTimeout(() => setNameHighlight(false), 1500);
      }
    }
  };

  const onFinish = async (values: any) => {
    if (cart.length === 0) return message.error('Giỏ hàng trống!');
    setLoading(true);
    const payload = {
      phone: values.phone,
      full_name: values.full_name,
      facebook: values.facebook,
      actor_email: currentUser,
      cartItems: cart,
      marketing_source: values.marketing_source || 'Chưa rõ'
    };
    const currCart = [...cart];

    const res = await checkoutOrderAction(payload);
    if (res.success) {
      message.success(res.message);

      form.resetFields();
      setCart([]);
      setInventory(prev => prev.filter(m => !currCart.some(c => c.inventory_id === m.id)));
    } else {
      message.error(res.message);
    }
    setLoading(false);
  };

  // Filtered available items
  const available = inventory.filter(item => !cart.some(c => c.inventory_id === item.id));
  const displayed = available.filter(item =>
  (item.serial?.toLowerCase().includes(searchText.toLowerCase()) ||
    getFullName(item.models).toLowerCase().includes(searchText.toLowerCase()))
  );

  const totalAmount = cart.reduce((sum, item) => sum + item.sale_price, 0);
  const totalProfit = cart.reduce((sum, item) => sum + (item.sale_price - item.cost_price), 0);

  return (
    <div className="pos-page">
      <div className="pos-header">
        <h2 className="pos-title">Bán Hàng</h2>
      </div>

      <div className="pos-grid">

        {/* ══════ LEFT: KỆ HÀNG (60%) ══════ */}
        <div className="pos-card">
          <h3 className="pos-card-title">
            💻 Máy Sẵn Bán
            <span className="count">{available.length} máy</span>
          </h3>

          <div className="pos-search" style={{ marginBottom: 14 }}>
            <Input
              ref={searchRef}
              size="large"
              prefix={<SearchOutlined />}
              placeholder="Quét serial hoặc gõ tên máy..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </div>

          <div className="product-list">
            {displayed.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#aeaeb2', fontSize: 13 }}>
                {searchText ? `Không tìm thấy "${searchText}"` : 'Hết hàng!'}
              </div>
            ) : displayed.map(item => {
              const cost = Number(item.purchase_price) + Number(item.additional_cost || 0);
              const specs = item.models?.specs;
              return (
                <div key={item.id} className="product-item" onClick={() => handleAddMachine(item)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="product-name">
                      {getFullName(item.models)}
                      {specs?.mdm && <Tag color="red" style={{ marginLeft: 8, fontSize: 10, lineHeight: '16px' }}>MDM</Tag>}
                    </div>
                    <div className="product-serial">SN: {item.serial || 'N/A'}</div>
                    {specs && (
                      <div className="product-specs">
                        {[specs.cpu, specs.ram, specs.storage].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                  <div className="product-cost">{fmtVND(cost)}</div>
                  <Button className="add-btn" size="small" icon={<PlusOutlined />} />
                </div>
              );
            })}
          </div>
        </div>

        {/* ══════ RIGHT: GIỎ HÀNG + CHECKOUT (40%) ══════ */}
        <div className="pos-card cart-container-card">
          <div className="card-header cart-header-main">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShoppingCartOutlined style={{ color: '#0A84FF' }} />
              <span style={{ fontWeight: 600, fontSize: 13, color: '#1d1d1f' }}>Giỏ Hàng</span>
            </div>
            {cart.length > 0 && <span className="count-badge">{cart.length} máy</span>}
          </div>

          <div className="cart-list-wrapper">
            {cart.length === 0 ? (
              <div className="cart-empty">Chưa có máy nào.</div>
            ) : (
              <div className="cart-list">
                {cart.map(item => {
                  const profit = item.sale_price - item.cost_price;
                  return (
                    <div key={item.inventory_id} className={`cart-item-smart ${profit < 0 ? 'is-loss' : ''}`}>
                      <div className="cart-item-info">
                        <div style={{ flex: 1 }}>
                          <div className="cart-item-name">{item.model_name}</div>
                          {formatSpecs(item.specs)}
                          <div className="cart-item-serial-row">
                            <span className="label">SN:</span> <span className="val">{item.serial}</span>
                            <span className="dot">·</span>
                            <span className="label">Vốn:</span> <span className="val cost">{fmtVND(item.cost_price)}</span>
                          </div>
                        </div>
                        <Button type="text" danger icon={<DeleteOutlined />} size="small"
                          className="cart-remove-btn"
                          onClick={() => handleRemoveFromCart(item.inventory_id)} />
                      </div>

                      <div className="cart-item-grid">
                        <div className="cart-grid-item">
                          <label><CreditCardOutlined /> Giá bán</label>
                          <InputNumber
                            variant="borderless"
                            value={item.sale_price}
                            formatter={(v: any) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            onChange={(val: any) => updateCartItem(item.inventory_id, 'sale_price', Number(val))}
                          />
                        </div>
                        <div className="cart-grid-item">
                          <label><InfoCircleOutlined /> BH (ngày)</label>
                          <InputNumber
                            variant="borderless"
                            min={0} max={3650}
                            value={item.warranty_days}
                            onChange={(val: any) => updateCartItem(item.inventory_id, 'warranty_days', Number(val))}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Customer Info — Option C: Smart Card */}
          <Form form={form} layout="vertical" onFinish={onFinish} className="customer-card-wrap">
            <div className={`customer-card ${isReturning ? 'is-returning' : ''}`}>
              <div className="card-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserOutlined style={{ color: '#0A84FF' }} />
                  <span style={{ fontWeight: 600, fontSize: 13, color: '#1d1d1f' }}>Thông tin khách hàng</span>
                </div>
                {isReturning && <Tag color="success" className="returning-tag">KHÁCH QUEN</Tag>}
              </div>

              <div className="card-body-grid">
                <Form.Item name="phone" rules={[{ required: true, message: 'Nhập SĐT!' }]} className="card-input-item">
                  <Input
                    variant="borderless"
                    prefix={<PhoneOutlined style={{ color: '#86868b' }} />}
                    placeholder="Số điện thoại"
                    onBlur={handlePhoneBlur}
                  />
                </Form.Item>
                <Form.Item name="full_name" rules={[{ required: true, message: 'Nhập tên!' }]} className="card-input-item">
                  <Input
                    variant="borderless"
                    prefix={<UserOutlined style={{ color: '#86868b' }} />}
                    placeholder="Tên khách hàng"
                    className={nameHighlight ? 'highlight-pulse' : ''}
                  />
                </Form.Item>
                <Form.Item name="facebook" className="card-input-item span-2">
                  <Input
                    variant="borderless"
                    prefix={<LinkOutlined style={{ color: '#86868b' }} />}
                    placeholder="Link Facebook (Tùy chọn)"
                  />
                </Form.Item>
              </div>

              <div className="marketing-pills-wrap">
                <Form.Item name="marketing_source" initialValue="Chưa rõ" noStyle>
                  <Radio.Group className="smart-pills" optionType="button" buttonStyle="solid" size="small">
                    <Radio.Button value="Facebook" className="pill-fb">Facebook</Radio.Button>
                    <Radio.Button value="Tiktok" className="pill-tiktok">Tiktok</Radio.Button>
                    <Radio.Button value="Voz" className="pill-voz">Voz</Radio.Button>
                    <Radio.Button value="Người quen" className="pill-referral">Người quen</Radio.Button>
                    <Radio.Button value="Khách cũ" className="pill-old">Khách cũ</Radio.Button>
                    <Radio.Button value="Vãng lai" className="pill-walkin">Vãng lai</Radio.Button>
                    <Radio.Button value="Chưa rõ" className="pill-other">Khác</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </div>
            </div>

            {/* Checkout Bar */}
            <div className="checkout-bar">
              <div className="checkout-total">
                <span className="checkout-label">Tổng thanh toán</span>
                <span className="checkout-amount">{fmtVND(totalAmount)}</span>
              </div>
              {cart.length > 0 && (
                <div className="checkout-profit-summary" style={totalProfit < 0 ? { color: '#FF3B30' } : {}}>
                  {totalProfit >= 0 ? `Lãi dự kiến: +${fmtVND(totalProfit)}` : `Lỗ dự kiến: -${fmtVND(Math.abs(totalProfit))}`}
                </div>
              )}
              <Button
                className="checkout-btn"
                type="primary"
                htmlType="submit"
                icon={<CreditCardOutlined />}
                loading={loading}
                disabled={cart.length === 0}
              >
                Chốt Đơn & Thu Tiền
              </Button>
            </div>
          </Form>
        </div>

      </div>
    </div>
  );
}