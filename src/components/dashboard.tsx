import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import './Dashboard.css';

interface DashboardProps {
  setActiveMenu: (menu: any) => void;
}

export default function Dashboard({ setActiveMenu }: DashboardProps) {
  // แจ้งเตือนต่างๆ ของร้านล้างรถ
  const [waitingQueueCount, setWaitingQueueCount] = useState(0);
  const [stockAlertCount, setStockAlertCount] = useState(0);

  useEffect(() => {
    let unsubQueue: () => void;
    let unsubStock: () => void;

    const startListeners = async () => {
      // 🔴 นับ Badge แจ้งเตือน: คิวที่กำลัง "รอรับบริการ" ของวันนี้
      const today = new Date().toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      const qQueue = query(
        collection(db, 'queues'),
        where('date', '==', today),
        where('status', '==', 'waiting')
      );
      unsubQueue = onSnapshot(qQueue, (snap) => {
        setWaitingQueueCount(snap.docs.length);
      });

      // 🟡 นับ Badge แจ้งเตือน: สต็อกน้ำยาล้างรถ (สมมติว่ามี collection 'inventory')
      unsubStock = onSnapshot(collection(db, 'inventory'), (snap) => {
        const count = snap.docs.filter((doc) => {
          const data = doc.data();
          return Number(data.stockQty) <= Number(data.minAlert || 5);
        }).length;
        setStockAlertCount(count);
      });
    };

    startListeners();
    return () => {
      if (unsubQueue) unsubQueue();
      if (unsubStock) unsubStock();
    };
  }, []);

  const menus = [
    {
      title: 'กระดานจัดการคิว',
      desc: 'เรียกคิว / อัปเดตสถานะรถ',
      icon: '📋',
      id: 'queue',
      color: '#4f46e5',
      badgeValue: waitingQueueCount,
    },
    {
      title: 'ฐานข้อมูลลูกค้า',
      desc: 'รายชื่อลูกค้าและข้อมูลรถ',
      icon: '👥',
      id: 'members',
      color: '#10b981',
    },
    {
      title: 'แพ็กเกจ & ราคา',
      desc: 'จัดการบริการและโปรโมชัน',
      icon: '💎',
      id: 'price',
      color: '#f59e0b',
    },
    {
      title: 'สต็อกน้ำยา & อุปกรณ์',
      desc: 'จัดการคลังวัสดุสิ้นเปลือง',
      icon: '🧴',
      id: 'inventory',
      color: '#ec4899',
      badgeValue: stockAlertCount,
    },
    {
      title: 'รายงานรายได้',
      desc: 'สรุปยอดขาย / สถิติรายวัน',
      icon: '📊',
      id: 'report',
      color: '#06b6d4',
    },
    {
      title: 'ตั้งค่าระบบ',
      desc: 'ข้อมูลร้าน / เวลาเปิดปิด',
      icon: '⚙️',
      id: 'settings',
      color: '#64748b',
    },
  ];

  return (
    <div className="dashboard-container">
      {/* 
        ✅ ลบ <header className="dashboard-header"> ทิ้งไปแล้ว 
        เพราะแถบด้านบนของ App.tsx มีชื่อร้าน Wow Wash & Detailing และปุ่ม Logout ครบแล้ว
      */}

      {/* ดัน Grid ลงมานิดหน่อยให้ดูสมดุลแทนส่วนหัวที่หายไป */}
      <div className="menu-grid" style={{ paddingTop: '2vh' }}>
        {menus.map((menu, index) => (
          <div
            key={index}
            className="menu-card"
            onClick={() => setActiveMenu(menu.id)}
            style={
              {
                '--menu-color': menu.color,
                position: 'relative',
              } as React.CSSProperties
            }
          >
            {menu.badgeValue !== undefined && menu.badgeValue > 0 && (
              <div
                className={`appointment-badge ${
                  menu.badgeValue > 99 ? 'plus' : ''
                }`}
              >
                {menu.badgeValue > 99 ? '99+' : menu.badgeValue}
              </div>
            )}
            <div className="card-pattern-bg">{menu.icon}</div>
            <div className="card-content">
              <div className="icon-main-box">{menu.icon}</div>
              <div className="text-content">
                <h3>{menu.title}</h3>
                <p>{menu.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
