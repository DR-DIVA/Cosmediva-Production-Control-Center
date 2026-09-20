import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env.local', 'utf-8');
const env = Object.fromEntries(
  envText.split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'))
    .map(line => {
      const idx = line.indexOf('=');
      return [line.slice(0, idx), line.slice(idx + 1).replace(/^["']|["']$/g, '')];
    })
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('line_notification_channels')
    .select('*')
    .eq('channel_key', 'maintenance')
    .single();

  if (error || !data) {
    console.error('Error fetching channel:', error);
    return;
  }

  console.log('Channel:', data.channel_key);
  console.log('Destination:', data.destination_id);
  console.log('Token exists:', Boolean(data.channel_access_token));

  const userId = 'Ubb755cd550e9b951b09a02fa8d93dfeb';

  // 1. Send Test Notification Flex Card
  const testCard = {
    to: userId,
    messages: [
      {
        type: 'flex',
        altText: '✅ ทดสอบเชื่อมต่อระบบแจ้งเตือน LINE สำเร็จ',
        contents: {
          type: 'bubble',
          size: 'kilo',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#065F46',
            paddingAll: '14px',
            contents: [
              {
                type: 'text',
                text: '🧪 ยืนยันการเชื่อมต่อ LINE สำเร็จ!',
                weight: 'bold',
                color: '#FFFFFF',
                size: 'sm'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            contents: [
              {
                type: 'text',
                text: '⚡ MTEX MaintenanceAI',
                size: 'sm',
                weight: 'bold',
                color: '#0F172A'
              },
              {
                type: 'text',
                text: 'ระบบ CosmeFlow Enterprise Gateway เชื่อมต่อกับ LINE Messaging API เรียบร้อยแล้ว พร้อมส่งการแจ้งเตือนงานซ่อมฉุกเฉินและอัปเดตสถานะแบบ Real-time',
                size: 'xs',
                color: '#475569',
                wrap: true
              },
              {
                type: 'separator',
                margin: 'sm'
              },
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#F0FDF4',
                paddingAll: '8px',
                cornerRadius: 'sm',
                contents: [
                  {
                    type: 'text',
                    text: `📌 ช่องทาง: ซ่อมบำรุง (Maintenance)`,
                    size: 'xxs',
                    color: '#166534',
                    weight: 'bold'
                  },
                  {
                    type: 'text',
                    text: `👤 ผู้รับ: Private Test (${userId.slice(0, 8)}...)`,
                    size: 'xxs',
                    color: '#166534'
                  },
                  {
                    type: 'text',
                    text: `⏰ เวลา: ${new Date().toLocaleString('th-TH')}`,
                    size: 'xxs',
                    color: '#64748B'
                  }
                ]
              }
            ]
          }
        }
      },
      {
        type: 'flex',
        altText: '🚨 [ตัวอย่างใบแจ้งซ่อมจริง] MIX-01 มอเตอร์มีเสียงดังผิดปกติ',
        contents: {
          type: 'bubble',
          size: 'mega',
          header: {
            type: 'box',
            layout: 'vertical',
            backgroundColor: '#B91C1C',
            paddingAll: '16px',
            contents: [
              {
                type: 'box',
                layout: 'horizontal',
                contents: [
                  {
                    type: 'text',
                    text: '🚨 แจ้งซ่อมเครื่องจักร (ตัวอย่างจริง)',
                    weight: 'bold',
                    color: '#FFFFFF',
                    size: 'md',
                    flex: 1
                  },
                  {
                    type: 'text',
                    text: 'WO-20260920-001',
                    color: '#FDE047',
                    size: 'xs',
                    weight: 'bold',
                    align: 'end'
                  }
                ]
              },
              {
                type: 'text',
                text: '🚨 ฉุกเฉิน: หยุดการผลิต (Critical Breakdown)',
                color: '#FEF08A',
                size: 'xs',
                weight: 'bold',
                margin: 'sm'
              }
            ]
          },
          body: {
            type: 'box',
            layout: 'vertical',
            paddingAll: '16px',
            spacing: 'md',
            contents: [
              {
                type: 'box',
                layout: 'vertical',
                backgroundColor: '#F8FAFC',
                cornerRadius: 'md',
                paddingAll: '12px',
                borderColor: '#E2E8F0',
                borderWidth: '1px',
                contents: [
                  {
                    type: 'box',
                    layout: 'horizontal',
                    contents: [
                      {
                        type: 'text',
                        text: 'MIX-01',
                        weight: 'bold',
                        size: 'lg',
                        color: '#0F172A',
                        flex: 1
                      },
                      {
                        type: 'text',
                        text: 'Grade A',
                        size: 'xs',
                        color: '#DC2626',
                        weight: 'bold'
                      }
                    ]
                  },
                  {
                    type: 'text',
                    text: 'เครื่องผสมสุญญากาศ Homogenizer 500L',
                    size: 'sm',
                    color: '#334155',
                    weight: 'bold',
                    wrap: true,
                    margin: 'xs'
                  },
                  {
                    type: 'text',
                    text: '📍 แผนกผลิตครีม (Cleanroom B) • ไลน์ผลิต A1',
                    size: 'xs',
                    color: '#64748B',
                    margin: 'xs'
                  }
                ]
              },
              {
                type: 'box',
                layout: 'vertical',
                spacing: 'sm',
                contents: [
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'อาการเสีย:', size: 'xs', color: '#64748B', flex: 2 },
                      { type: 'text', text: 'มอเตอร์มีเสียงดังผิดปกติและกลิ่นไหม้', size: 'xs', color: '#DC2626', weight: 'bold', wrap: true, flex: 5 }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'รายละเอียด:', size: 'xs', color: '#64748B', flex: 2 },
                      { type: 'text', text: 'ขณะกำลังปั่นครีมเบ้าที่ 2 รอบความเร็วตกและมีควันจางๆ ออกมาจากตัวควบคุม', size: 'xs', color: '#1E293B', wrap: true, flex: 5 }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'ผลกระทบ:', size: 'xs', color: '#64748B', flex: 2 },
                      { type: 'text', text: 'หยุดการผลิตทันที (Production Stopped)', size: 'xs', color: '#0F172A', weight: 'bold', wrap: true, flex: 5 }
                    ]
                  },
                  {
                    type: 'box',
                    layout: 'baseline',
                    contents: [
                      { type: 'text', text: 'ผู้แจ้งซ่อม:', size: 'xs', color: '#64748B', flex: 2 },
                      { type: 'text', text: `หัวหน้ากะ A (20 ก.ย. ${new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.)`, size: 'xs', color: '#475569', wrap: true, flex: 5 }
                    ]
                  }
                ]
              }
            ]
          },
          footer: {
            type: 'box',
            layout: 'vertical',
            spacing: 'sm',
            paddingAll: '12px',
            contents: [
              {
                type: 'button',
                style: 'primary',
                color: '#1E293B',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '🛠️ รับงานซ่อม / บันทึกผล',
                  uri: 'https://cosmediva-production-control-center-production.up.railway.app/maintenance/technician'
                }
              },
              {
                type: 'button',
                style: 'link',
                height: 'sm',
                action: {
                  type: 'uri',
                  label: '🔍 ดูประวัติเครื่องจักร 360°',
                  uri: 'https://cosmediva-production-control-center-production.up.railway.app/maintenance/machines/MIX-01'
                }
              }
            ]
          }
        }
      }
    ]
  };

  const res = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + data.channel_access_token.trim()
    },
    body: JSON.stringify(testCard)
  });

  console.log('LINE API Status:', res.status);
  const respBody = await res.text();
  console.log('LINE API Response:', respBody || 'SUCCESS (200 OK)');
}

run();
