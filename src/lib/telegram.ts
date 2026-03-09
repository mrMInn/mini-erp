// File: src/lib/telegram.ts

export async function sendTelegramMessage(message: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  
  if (!token || !chatId) {
    console.warn('⚠️ Chưa cấu hình Telegram Bot trong file .env.local!');
    return;
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML' // Cho phép in đậm, in nghiêng cho đẹp
      })
    });
  } catch (error) {
    console.error('Lỗi gửi tin nhắn Telegram:', error);
  }
}