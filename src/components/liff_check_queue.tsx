import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { db } from '../firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  getDoc,
} from 'firebase/firestore';

// ✅ ฟังก์ชันสร้างวันที่ (5 วัน)
const getFormattedDate = (daysToAdd: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const LiffCheckQueue: React.FC = () => {
  const liffId = '2009711737-KCfmze4b';

  const [liffProfile, setLiffProfile] = useState<any>(null);
  const [view, setView] = useState<
    'loading' | 'select_role' | 'customer_view' | 'staff_login' | 'staff_view'
  >('loading');

  // --- State ของลูกค้า ---
  const [myQueues, setMyQueues] = useState<any[]>([]);
  const [editingQueue, setEditingQueue] = useState<any>(null);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  // --- State ของพนักงาน ---
  const [pinInput, setPinInput] = useState('');
  const [staffDate, setStaffDate] = useState(getFormattedDate(0));
  const [staffQueues, setStaffQueues] = useState<any[]>([]);
  const [selectedStaffQueue, setSelectedStaffQueue] = useState<any>(null);

  // ✅ เพิ่ม State สำหรับจัดการการชำระเงิน
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // --- ข้อมูลเวลาและวันที่ (แบบเดียวกับหน้าจอง) ---
  const dates = [
    getFormattedDate(0),
    getFormattedDate(1),
    getFormattedDate(2),
    getFormattedDate(3),
    getFormattedDate(4),
  ];
  const morningSlots = [
    '08:00 - 08:30',
    '08:30 - 09:00',
    '09:00 - 09:30',
    '09:30 - 10:00',
    '10:00 - 10:30',
    '10:30 - 11:00',
    '11:00 - 11:30',
    '11:30 - 12:00',
  ];
  const afternoonSlots = [
    '12:00 - 12:30',
    '12:30 - 13:00',
    '13:00 - 13:30',
    '13:30 - 14:00',
    '14:00 - 14:30',
    '14:30 - 15:00',
    '15:00 - 15:30',
    '15:30 - 16:00',
    '16:00 - 16:30',
    '16:30 - 17:00',
    '17:00 - 17:30',
    '17:30 - 18:00',
    '18:00 - 18:30',
  ];
  const allSlots = [...morningSlots, ...afternoonSlots];

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId });
        if (!liff.isLoggedIn()) {
          liff.login();
          return;
        }
        const profile = await liff.getProfile();
        setLiffProfile(profile);

        // ✅ ดึงข้อมูลช่องทางการชำระเงินรอไว้เลย
        const paySnap = await getDoc(doc(db, 'settings', 'payments'));
        if (paySnap.exists() && paySnap.data().list) {
          setPaymentMethods(paySnap.data().list);
        } else {
          setPaymentMethods(['เงินสด', 'เงินโอน']);
        }

        setView('select_role');
      } catch (error) {
        console.error('LIFF Init Error: ', error);
      }
    };
    initLiff();
  }, []);

  // ==========================================
  // ลูกค้า (Customer Logic)
  // ==========================================
  const fetchMyQueues = async () => {
    setView('loading');
    try {
      const q = query(
        collection(db, 'queues'),
        where('userId', '==', liffProfile.userId),
        where('status', 'in', ['waiting', 'in_progress'])
      );
      const snap = await getDocs(q);
      const queues: any[] = [];
      snap.forEach((doc) => queues.push({ id: doc.id, ...doc.data() }));

      queues.sort((a, b) => {
        if (a.date !== b.date)
          return dates.indexOf(a.date) - dates.indexOf(b.date);
        return a.timeSlot.localeCompare(b.timeSlot);
      });

      setMyQueues(queues);
      setView('customer_view');
    } catch (e) {
      alert('เกิดข้อผิดพลาดในการดึงข้อมูลคิว');
    }
  };

  const isActionAllowed = (qDate: string, qTime: string) => {
    if (qDate !== dates[0]) return true;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();
    const [startHr, startMin] = qTime.split(' - ')[0].split(':').map(Number);
    const startMins = startHr * 60 + startMin;
    if (startMins - currentMins <= 60) return false;
    return true;
  };

  const handleCancelQueue = async (
    queueId: string,
    qDate: string,
    qTime: string
  ) => {
    if (!isActionAllowed(qDate, qTime)) {
      alert(
        '❌ ไม่สามารถยกเลิกได้ เนื่องจากเหลือน้อยกว่า 1 ชั่วโมงก่อนถึงคิวของคุณ กรุณาติดต่อทางร้านโดยตรงครับ'
      );
      return;
    }
    if (
      window.confirm(
        'คุณต้องการยกเลิกคิวนี้ใช่หรือไม่? (ช่วงเวลานี้จะกลับมาว่างให้คนอื่นจองได้)'
      )
    ) {
      await updateDoc(doc(db, 'queues', queueId), {
        status: 'canceled',
        canceledAt: serverTimestamp(),
        canceledBy: 'customer',
      });
      alert('ยกเลิกคิวเรียบร้อยแล้วครับ');
      fetchMyQueues();
    }
  };

  useEffect(() => {
    if (!newDate) return;
    const fetchAvailable = async () => {
      setIsCheckingSlots(true);
      const q = query(collection(db, 'queues'), where('date', '==', newDate));
      const snap = await getDocs(q);
      const booked: string[] = [];
      snap.forEach((doc) => {
        if (doc.data().status !== 'canceled') booked.push(doc.data().timeSlot);
      });
      setBookedSlots(booked);
      setIsCheckingSlots(false);
    };
    fetchAvailable();
  }, [newDate]);

  const handleRescheduleQueue = async () => {
    if (!newTime) return;
    try {
      await updateDoc(doc(db, 'queues', editingQueue.id), {
        date: newDate,
        timeSlot: newTime,
        rescheduleHistory: arrayUnion({
          oldDate: editingQueue.date,
          oldTime: editingQueue.timeSlot,
          changedAt: new Date().toISOString(),
        }),
      });
      alert('เลื่อนคิวสำเร็จแล้วครับ!');
      setEditingQueue(null);
      fetchMyQueues();
    } catch (e) {
      alert('เลื่อนคิวไม่สำเร็จ');
    }
  };

  // ==========================================
  // พนักงาน (Staff Logic)
  // ==========================================
  const handleStaffLogin = async () => {
    setView('loading');
    try {
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);

      let correctPin = '1234';
      if (docSnap.exists() && docSnap.data().staffPin) {
        correctPin = docSnap.data().staffPin;
      }

      if (pinInput === correctPin) {
        fetchStaffQueues(staffDate);
      } else {
        alert('รหัส PIN ไม่ถูกต้องครับ');
        setPinInput('');
        setView('staff_login');
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการตรวจสอบรหัส');
      setView('staff_login');
    }
  };

  const fetchStaffQueues = async (dateStr: string) => {
    setView('loading');
    setStaffDate(dateStr);
    try {
      const q = query(collection(db, 'queues'), where('date', '==', dateStr));
      const snap = await getDocs(q);
      const queues: any[] = [];
      snap.forEach((doc) => {
        if (doc.data().status !== 'canceled')
          queues.push({ id: doc.id, ...doc.data() });
      });
      setStaffQueues(queues);
      setView('staff_view');
    } catch (e) {
      alert('โหลดข้อมูลไม่สำเร็จ');
    }
  };

  const handleUpdateStatus = async (
    newStatus: string,
    paymentMethod?: string
  ) => {
    if (!selectedStaffQueue) return;
    try {
      const updateData: any = { status: newStatus };

      // ✅ ถ้าเป็นสถานะเสร็จงาน ให้บันทึกวิธีชำระเงินด้วย
      if (newStatus === 'completed' && paymentMethod) {
        updateData.paymentMethod = paymentMethod;
        updateData.isPaid = true;
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'queues', selectedStaffQueue.id), updateData);

      if (
        selectedStaffQueue.userId &&
        selectedStaffQueue.userId !== 'test_user'
      ) {
        try {
          const response = await fetch('/.netlify/functions/sendLineFlex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: selectedStaffQueue.userId,
              queueNumber: selectedStaffQueue.queueNumber,
              status: newStatus,
              carModel: `${selectedStaffQueue.carModel} (${selectedStaffQueue.licensePlate})`,
            }),
          });

          if (!response.ok) {
            console.error('Failed to send LINE notification');
          }
        } catch (fetchError) {
          console.error('Netlify function fetch error:', fetchError);
        }
      }

      alert('อัปเดตสถานะเสร็จสิ้น!');
      setShowPaymentModal(false);
      setSelectedStaffQueue(null);
      fetchStaffQueues(staffDate);
    } catch (e) {
      alert('อัปเดตสถานะล้มเหลว');
    }
  };

  // ==========================================
  // RENDER VIEWS
  // ==========================================
  if (view === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // --- 1. หน้าเลือกบทบาท ---
  if (view === 'select_role') {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center border border-gray-100">
          <div className="text-5xl mb-4">🔍</div>
          <h2 className="text-xl font-black text-gray-800 mb-6">
            เมนูตรวจสอบคิว
          </h2>
          <div className="space-y-4">
            <button
              onClick={fetchMyQueues}
              className="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md flex items-center justify-center transition-all"
            >
              <span className="mr-2 text-xl">👤</span> ฉันเป็นลูกค้า
              (ดูคิวของฉัน)
            </button>
            <button
              onClick={() => setView('staff_login')}
              className="w-full py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 shadow-sm flex items-center justify-center border border-gray-200 transition-all"
            >
              <span className="mr-2 text-xl">🛠️</span> ฉันเป็นพนักงานร้าน
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. หน้าใส่ PIN พนักงาน ---
  if (view === 'staff_login') {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4 font-sans">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center relative border border-gray-100">
          <button
            onClick={() => setView('select_role')}
            className="absolute top-6 left-6 text-gray-400 hover:text-gray-600 font-bold"
          >
            ←
          </button>
          <div className="text-5xl mb-4 mt-2">🔒</div>
          <h2 className="text-xl font-black text-gray-800 mb-2">
            เข้าสู่ระบบพนักงาน
          </h2>
          <p className="text-xs text-gray-500 mb-6">กรุณาระบุรหัส PIN 4 หลัก</p>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            className="w-full text-center text-4xl tracking-[0.5em] p-4 border-2 border-emerald-300 rounded-xl outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 mb-6 bg-emerald-50 text-emerald-800"
            placeholder="••••"
          />
          <button
            onClick={handleStaffLogin}
            className="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
          >
            ตรวจสอบรหัส
          </button>
        </div>
      </div>
    );
  }

  // --- 3. หน้าตรวจสอบคิวของลูกค้า ---
  if (view === 'customer_view') {
    return (
      <div className="min-h-screen bg-gray-100 font-sans pb-10">
        <div className="bg-emerald-600 text-white p-5 shadow-md flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="font-bold text-lg">รายการคิวของคุณ</div>
            <div className="text-xs text-emerald-100">
              {liffProfile?.displayName}
            </div>
          </div>
          <button
            onClick={() => liff.closeWindow()}
            className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-bold transition-all"
          >
            ปิดหน้าต่าง
          </button>
        </div>

        <div className="p-4 space-y-4">
          {myQueues.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center shadow-sm border border-gray-100 mt-6">
              <div className="text-5xl mb-3 opacity-50">✨</div>
              <p className="text-gray-500 font-bold">
                คุณยังไม่มีคิวที่รอดำเนินการครับ
              </p>
              <button
                onClick={() => liff.closeWindow()}
                className="mt-4 px-6 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold"
              >
                กลับไปที่แชท
              </button>
            </div>
          ) : (
            myQueues.map((q) => (
              <div
                key={q.id}
                className="bg-white rounded-2xl shadow-sm border border-emerald-100 overflow-hidden relative"
              >
                <div className="bg-emerald-50 px-4 py-3 border-b border-emerald-100 flex justify-between items-center">
                  <div className="font-black text-emerald-800 text-lg">
                    คิว: {q.queueNumber}
                  </div>
                  {q.status === 'waiting' ? (
                    <span className="bg-yellow-400 text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm uppercase tracking-wide">
                      รอรับบริการ
                    </span>
                  ) : (
                    <span className="bg-emerald-500 text-white text-[10px] px-2 py-1 rounded font-bold shadow-sm animate-pulse uppercase tracking-wide">
                      กำลังล้างรถ
                    </span>
                  )}
                </div>
                <div className="p-4 space-y-3 text-sm text-gray-700">
                  <div className="flex justify-between items-end border-b border-gray-50 pb-2">
                    <span className="text-gray-400 text-xs font-bold">
                      วันและเวลา
                    </span>
                    <div className="text-right">
                      <strong className="text-emerald-600 block">
                        {q.date}
                      </strong>
                      <strong className="text-emerald-700 text-lg">
                        {q.timeSlot}
                      </strong>
                    </div>
                  </div>
                  <p className="flex justify-between">
                    <span className="text-gray-400 text-xs font-bold">
                      รถที่ล้าง:
                    </span>{' '}
                    <strong>
                      {q.carModel} ({q.licensePlate})
                    </strong>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-gray-400 text-xs font-bold">
                      บริการ:
                    </span>{' '}
                    <strong>{q.service}</strong>
                  </p>

                  {q.isPickup && (
                    <p className="flex justify-between text-orange-600 bg-orange-50 p-2 rounded-lg border border-orange-100">
                      <span className="text-xs font-bold">🚚 บริการรับรถ:</span>
                      <strong>
                        ใช่ (+฿{q.pickupFee} / {q.distance} กม.)
                      </strong>
                    </p>
                  )}

                  {q.note && (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                      <span className="text-gray-400 text-[10px] font-bold block mb-1">
                        📝 หมายเหตุ:
                      </span>
                      <div className="text-xs italic text-gray-600">
                        "{q.note}"
                      </div>
                    </div>
                  )}
                </div>

                {q.status === 'waiting' && (
                  <div className="px-4 py-3 bg-gray-50 flex gap-2 border-t border-gray-100">
                    <button
                      onClick={() => {
                        if (isActionAllowed(q.date, q.timeSlot)) {
                          setEditingQueue(q);
                          setNewDate(q.date);
                          setNewTime(q.timeSlot);
                        } else {
                          alert(
                            '❌ ใกล้ถึงเวลาคิวของคุณแล้ว ไม่สามารถเลื่อนได้ครับ'
                          );
                        }
                      }}
                      className="flex-1 bg-white border border-emerald-500 text-emerald-600 py-2.5 rounded-xl font-bold hover:bg-emerald-50 shadow-sm transition-all text-sm"
                    >
                      🗓️ เลื่อนเวลา
                    </button>
                    <button
                      onClick={() =>
                        handleCancelQueue(q.id, q.date, q.timeSlot)
                      }
                      className="flex-1 bg-white border border-red-300 text-red-500 py-2.5 rounded-xl font-bold hover:bg-red-50 shadow-sm transition-all text-sm"
                    >
                      🗑️ ยกเลิกคิว
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* --- Modal ลูกค้าเลื่อนคิว --- */}
        {editingQueue && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl h-[85vh] sm:h-auto flex flex-col">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
                <div>
                  <h3 className="font-bold text-xl text-emerald-800">
                    เลื่อนคิวใหม่
                  </h3>
                  <p className="text-xs text-gray-400">
                    คิวเดิม: {editingQueue.queueNumber} ({editingQueue.date}{' '}
                    {editingQueue.timeSlot})
                  </p>
                </div>
                <button
                  onClick={() => setEditingQueue(null)}
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 font-bold"
                >
                  &times;
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-6 pb-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-3">
                    1. เลือกวันที่ต้องการเลื่อนไป
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {dates.map((d) => (
                      <button
                        key={d}
                        onClick={() => {
                          setNewDate(d);
                          setNewTime('');
                        }}
                        className={`flex-shrink-0 w-16 py-3 rounded-xl border-2 transition-all ${
                          newDate === d
                            ? 'border-emerald-600 bg-emerald-600 text-white font-bold shadow-md'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className="text-sm font-black">
                          {d.split(' ')[0]}
                        </div>
                        <div className="text-[10px]">{d.split(' ')[1]}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-3 flex justify-between">
                    <span>2. เลือกรอบเวลาใหม่</span>
                    {isCheckingSlots && (
                      <span className="text-emerald-500 animate-pulse">
                        กำลังเช็ก...
                      </span>
                    )}
                  </label>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-4 gap-2">
                      {allSlots.map((slot) => {
                        const isBooked =
                          bookedSlots.includes(slot) &&
                          slot !== editingQueue.timeSlot;
                        let isPassed = false;
                        if (newDate === dates[0]) {
                          const now = new Date();
                          const currentMins =
                            now.getHours() * 60 + now.getMinutes();
                          const [startHr, startMin] = slot
                            .split(' - ')[0]
                            .split(':')
                            .map(Number);
                          if (currentMins >= startHr * 60 + startMin)
                            isPassed = true;
                        }
                        const isDisabled =
                          isBooked || isPassed || isCheckingSlots;
                        return (
                          <button
                            key={slot}
                            disabled={isDisabled}
                            onClick={() => setNewTime(slot)}
                            className={`p-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
                              isDisabled
                                ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
                                : newTime === slot
                                ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105'
                                : 'bg-white text-emerald-700 border-emerald-100 hover:border-emerald-300'
                            }`}
                          >
                            {slot.split(' - ')[0]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-gray-100">
                <button
                  disabled={
                    !newTime ||
                    (newTime === editingQueue.timeSlot &&
                      newDate === editingQueue.date)
                  }
                  onClick={handleRescheduleQueue}
                  className="w-full py-4 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed shadow-md transition-all text-lg"
                >
                  บันทึกการเลื่อนคิว
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- 4. หน้าจัดการของพนักงาน (Staff View) ---
  if (view === 'staff_view') {
    return (
      <div className="min-h-screen bg-gray-50 font-sans flex flex-col pb-6">
        <div className="bg-gray-900 text-white p-4 shadow-md flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="font-bold text-lg">🛠️ ระบบพนักงานลานซักล้าง</div>
          </div>
          <button
            onClick={() => setView('select_role')}
            className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-lg font-bold transition-all"
          >
            ออกระบบ
          </button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
            {dates.map((d) => (
              <button
                key={d}
                onClick={() => fetchStaffQueues(d)}
                className={`flex-shrink-0 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all ${
                  staffDate === d
                    ? 'bg-gray-800 text-white border-gray-800'
                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800">ตารางงาน: {staffDate}</h3>
              <button
                onClick={() => fetchStaffQueues(staffDate)}
                className="text-gray-400 hover:text-gray-600"
              >
                🔄
              </button>
            </div>

            <div className="p-2 space-y-1.5">
              {allSlots.map((slot) => {
                const queueInSlot = staffQueues.find(
                  (q) => q.timeSlot === slot
                );

                if (!queueInSlot) {
                  return (
                    <div
                      key={slot}
                      className="flex bg-white rounded-xl p-3 items-center border border-dashed border-gray-200"
                    >
                      <div className="w-16 font-black text-gray-300 text-xs">
                        {slot.split(' - ')[0]}
                      </div>
                      <div className="flex-1 text-gray-300 font-bold text-xs">
                        -- ว่าง --
                      </div>
                    </div>
                  );
                }

                const isWaiting = queueInSlot.status === 'waiting';
                const isInProgress = queueInSlot.status === 'in_progress';
                const isCompleted = queueInSlot.status === 'completed';

                return (
                  <div
                    key={slot}
                    onClick={() =>
                      !isCompleted && setSelectedStaffQueue(queueInSlot)
                    }
                    className={`flex flex-col sm:flex-row rounded-xl p-3 sm:items-center border-2 cursor-pointer shadow-sm transition-all ${
                      isWaiting
                        ? 'bg-white border-yellow-400 hover:bg-yellow-50'
                        : isInProgress
                        ? 'bg-emerald-50 border-emerald-500'
                        : 'bg-gray-50 border-gray-200 opacity-60 cursor-not-allowed'
                    }`}
                  >
                    <div className="flex items-center justify-between sm:w-full">
                      <div className="flex items-center flex-1">
                        <div
                          className={`w-16 font-black text-sm ${
                            isWaiting
                              ? 'text-yellow-600'
                              : isInProgress
                              ? 'text-emerald-600'
                              : 'text-gray-400'
                          }`}
                        >
                          {slot.split(' - ')[0]}
                        </div>
                        <div className="flex-1">
                          <div className="font-bold text-gray-800 text-sm">
                            {queueInSlot.licensePlate} {queueInSlot.province}
                          </div>
                          <div className="text-[10px] text-gray-500 font-medium">
                            {queueInSlot.service}
                            {queueInSlot.isPickup && (
                              <span className="ml-1 text-orange-500 font-bold">
                                🚚 รับรถ
                              </span>
                            )}
                          </div>
                          {queueInSlot.note && (
                            <div className="text-[9px] text-gray-400 italic truncate max-w-[150px]">
                              📝 {queueInSlot.note}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="ml-2">
                        {isWaiting && (
                          <span className="bg-yellow-400 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm uppercase tracking-wide">
                            รอล้าง
                          </span>
                        )}
                        {isInProgress && (
                          <span className="bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold animate-pulse shadow-sm uppercase tracking-wide">
                            กำลังล้าง
                          </span>
                        )}
                        {isCompleted && (
                          <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wide">
                            เสร็จแล้ว
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- Modal พนักงานอัปเดตสถานะ --- */}
        {selectedStaffQueue && (
          <div className="fixed inset-0 bg-gray-900/70 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl pb-8 sm:pb-6">
              <div className="text-center mb-6">
                <div className="text-xs text-gray-400 font-bold uppercase mb-2 tracking-widest">
                  อัปเดตสถานะคิวล้างรถ
                </div>
                <div className="text-4xl font-black text-gray-800 mb-1">
                  {selectedStaffQueue.licensePlate}
                </div>
                <div className="text-sm text-gray-500 font-bold">
                  {selectedStaffQueue.carModel}
                </div>

                <div className="mt-4 bg-gray-50 p-3 rounded-xl border border-gray-100 text-left text-sm space-y-1">
                  <p>
                    <span className="text-gray-400">บริการ:</span>{' '}
                    <strong className="text-gray-700">
                      {selectedStaffQueue.service}
                    </strong>
                  </p>
                  {selectedStaffQueue.isPickup && (
                    <p className="text-orange-600 font-bold">
                      🚚 มีบริการไปรับรถ
                    </p>
                  )}
                  {selectedStaffQueue.note && (
                    <p>
                      <span className="text-gray-400">หมายเหตุ:</span>{' '}
                      <strong className="text-red-500">
                        {selectedStaffQueue.note}
                      </strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {selectedStaffQueue.status === 'waiting' && (
                  <button
                    onClick={() => handleUpdateStatus('in_progress')}
                    className="w-full py-4 rounded-xl font-bold text-white bg-blue-500 shadow-lg text-lg hover:bg-blue-600 transition-all transform hover:-translate-y-1 flex items-center justify-center"
                  >
                    <span className="mr-2 text-2xl">💦</span> เรียกคิว /
                    เริ่มล้าง
                  </button>
                )}
                {selectedStaffQueue.status === 'in_progress' && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full py-4 rounded-xl font-bold text-white bg-emerald-500 shadow-lg text-lg hover:bg-emerald-600 transition-all transform hover:-translate-y-1 flex items-center justify-center"
                  >
                    <span className="mr-2 text-2xl">✅</span> เสร็จงาน /
                    ชำระเงิน
                  </button>
                )}
                <button
                  onClick={() => setSelectedStaffQueue(null)}
                  className="w-full py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  ปิดหน้าต่าง
                </button>
              </div>

              <div className="mt-5 text-center">
                <p className="text-[10px] text-gray-400">
                  💡 ระบบจะส่งข้อความแจ้งเตือนเข้า LINE ลูกค้าอัตโนมัติ
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ✅ เพิ่ม Modal เลือกช่องทางชำระเงิน (เด้งขึ้นมาเมื่อพนักงานกด "เสร็จงาน") */}
        {showPaymentModal && selectedStaffQueue && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-8 shadow-2xl animate-slide-up">
              <h3 className="text-xl font-black text-center mb-2 text-gray-800">
                💰 ชำระเงินเรียบร้อยแล้ว
              </h3>
              <p className="text-center text-xs text-gray-400 mb-6 uppercase tracking-widest">
                กรุณาเลือกช่องทางการรับเงิน
              </p>

              <div className="grid grid-cols-1 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method}
                    onClick={() => handleUpdateStatus('completed', method)}
                    className="py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black border-2 border-emerald-100 active:bg-emerald-600 active:text-white transition-all shadow-sm flex justify-between items-center px-6"
                  >
                    <span>{method}</span>
                    <span className="text-xs opacity-50">เลือก ➔</span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowPaymentModal(false)}
                className="w-full mt-6 py-2 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
              >
                ย้อนกลับ
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default LiffCheckQueue;
