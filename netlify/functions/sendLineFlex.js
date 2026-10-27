// โค้ดนี้จะรันบน Server ของ Netlify เท่านั้น ปลอดภัย 100%
const fetch = require('node-fetch');

exports.handler = async function (event, context) {
  // อนุญาตเฉพาะ POST request
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    // รับข้อมูลมาจากหน้าเว็บ React
    const { userId, queueNumber, status, carModel } = JSON.parse(event.body);

    // ดึง Token ที่เราซ่อนไว้ในเว็บ Netlify
    const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    // สร้างข้อความ Flex Message (คุณนุ๊กสามารถไปแต่งให้สวยขึ้นได้ใน LINE Flex Simulator)
    let messageText = '';
    let statusColor = '';

    if (status === 'in_progress') {
      messageText = 'ถึงคิวของคุณแล้ว! กำลังนำรถเข้าช่องล้างครับ 💦';
      statusColor = '#10B981'; // สีเขียว
    } else if (status === 'completed') {
      messageText = 'รถของคุณล้างเสร็จเรียบร้อยแล้ว มารับรถได้เลยครับ! ✅';
      statusColor = '#3B82F6'; // สีฟ้า
    }

    const flexPayload = {
      to: userId,
      messages: [
        {
          type: 'flex',
          altText: 'อัปเดตสถานะคิวล้างรถ',
          contents: {
            type: 'bubble',
            size: 'kilo',
            header: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: 'อัปเดตสถานะ',
                  color: '#ffffff',
                  weight: 'bold',
                },
              ],
              backgroundColor: statusColor,
            },
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [
                {
                  type: 'text',
                  text: `คิว: ${queueNumber}`,
                  weight: 'bold',
                  size: 'xl',
                },
                {
                  type: 'text',
                  text: `รถ: ${carModel}`,
                  size: 'sm',
                  color: '#666666',
                  margin: 'sm',
                },
                { type: 'text', text: messageText, margin: 'lg', wrap: true },
              ],
            },
          },
        },
      ],
    };

    // ยิงคำสั่งไปหา API ของ LINE
    const response = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${LINE_TOKEN}`,
      },
      body: JSON.stringify(flexPayload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('LINE API Error:', errorData);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to send message' }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, message: 'Message sent!' }),
    };
  } catch (error) {
    console.error('Server Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
