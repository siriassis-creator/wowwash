import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  updateDoc,
  doc,
  deleteDoc,
  addDoc,
  serverTimestamp,
  where,
  orderBy,
  getDoc,
} from 'firebase/firestore';

const getFormattedDate = (daysToAdd: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const BASE_PICKUP_FEE = 50;
const CHARGE_PER_KM = 10;

const Queue: React.FC = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [, setIsLoading] = useState(true);

  const dates = [
    getFormattedDate(0),
    getFormattedDate(1),
    getFormattedDate(2),
    getFormattedDate(3),
    getFormattedDate(4),
  ];
  const [filterDate, setFilterDate] = useState<string>(dates[0]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingQueue, setEditingQueue] = useState<any>(null);

  // ✅ State สำหรับการชำระเงิน
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'เงินสด',
    'เงินโอน',
  ]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [queueToComplete, setQueueToComplete] = useState<any>(null);

  // ✅ State สำหรับส่วนลด
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');

  const [carDataFromDB, setCarDataFromDB] = useState<
    Record<string, { model: string; size: string }[]>
  >({});
  const [pricingDB, setPricingDB] = useState<
    Record<string, Record<string, number>>
  >({});
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [currentCarSize, setCurrentCarSize] = useState<string>('S');
  const [baseServicePrice, setBaseServicePrice] = useState<number>(0);

  const [searchPhone, setSearchPhone] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [selectedCarIndex, setSelectedCarIndex] = useState<string>('0');

  const [service, setService] = useState('');
  const [bookDate, setBookDate] = useState(dates[0]);
  const [timeSlot, setTimeSlot] = useState('');
  const [bookNote, setBookNote] = useState('');
  const [isPickup, setIsPickup] = useState(false);
  const [distanceInput, setDistanceInput] = useState<number>(0);
  const [calculatedFee, setCalculatedFee] = useState(0);

  const [modalBookedSlots, setModalBookedSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

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
    const fetchSettings = async () => {
      try {
        const carSnap = await getDoc(doc(db, 'settings', 'carModels'));
        if (carSnap.exists() && carSnap.data().brands)
          setCarDataFromDB(carSnap.data().brands);

        const priceSnap = await getDoc(doc(db, 'settings', 'pricing'));
        if (priceSnap.exists() && priceSnap.data().services) {
          const svcs = priceSnap.data().services;
          setPricingDB(svcs);
          const svcKeys = Object.keys(svcs);
          setServiceList(svcKeys);
          if (svcKeys.length > 0 && !service) setService(svcKeys[0]);
        }

        const paySnap = await getDoc(doc(db, 'settings', 'payments'));
        if (paySnap.exists() && paySnap.data().list)
          setPaymentMethods(paySnap.data().list);

        // ✅ ดึงข้อมูลโค้ดส่วนลด
        const discountSnap = await getDoc(doc(db, 'settings', 'discounts'));
        if (discountSnap.exists() && discountSnap.data().list) {
          setAvailableDiscounts(discountSnap.data().list);
        }
      } catch (error) {
        console.error('Error:', error);
      }
    };
    fetchSettings();
  }, [service]);

  useEffect(() => {
    let searchModel = '';
    if (editingQueue && !foundUser) searchModel = editingQueue.carModel;
    else if (foundUser && foundUser.cars[Number(selectedCarIndex)])
      searchModel = foundUser.cars[Number(selectedCarIndex)].carModel;
    let foundSize = 'S';
    if (searchModel) {
      for (const brand in carDataFromDB) {
        for (const item of carDataFromDB[brand]) {
          if (searchModel.includes(item.model)) {
            foundSize = item.size;
            break;
          }
        }
      }
    }
    setCurrentCarSize(foundSize);
  }, [selectedCarIndex, foundUser, carDataFromDB, editingQueue]);

  useEffect(() => {
    if (service && pricingDB[service])
      setBaseServicePrice(pricingDB[service][currentCarSize] || 0);
    else setBaseServicePrice(0);
  }, [service, currentCarSize, pricingDB]);

  const fetchQueues = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'queues'), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const queuesData: any[] = [];
      querySnapshot.forEach((docSnap) => {
        if (docSnap.data().status !== 'canceled')
          queuesData.push({ id: docSnap.id, ...docSnap.data() });
      });
      setQueues(queuesData);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchQueues();
  }, []);

  useEffect(() => {
    if ((!showAddModal && !editingQueue) || !bookDate) return;
    const fetchModalSlots = async () => {
      setIsCheckingSlots(true);
      const q = query(collection(db, 'queues'), where('date', '==', bookDate));
      const snap = await getDocs(q);
      const booked: string[] = [];
      snap.forEach((doc) => {
        if (doc.data().status !== 'canceled' && doc.id !== editingQueue?.id)
          booked.push(doc.data().timeSlot);
      });
      setModalBookedSlots(booked);
      setIsCheckingSlots(false);
    };
    fetchModalSlots();
  }, [bookDate, showAddModal, editingQueue]);

  useEffect(() => {
    if (isPickup)
      setCalculatedFee(
        Math.ceil(BASE_PICKUP_FEE + distanceInput * CHARGE_PER_KM)
      );
    else setCalculatedFee(0);
  }, [isPickup, distanceInput]);

  const sendLineNotification = async (targetQueue: any, newStatus: string) => {
    if (!targetQueue.userId || targetQueue.userId === 'test_user') return;
    try {
      await fetch('/.netlify/functions/sendLineFlex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetQueue.userId,
          queueNumber: targetQueue.queueNumber,
          status: newStatus,
          carModel: `${targetQueue.carModel} (${targetQueue.licensePlate})`,
        }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateStatus = async (
    q: any,
    newStatus: string,
    paymentMethod?: string
  ) => {
    if (newStatus === 'completed' && !paymentMethod) {
      setQueueToComplete(q);
      setShowPaymentModal(true);
      return;
    }

    try {
      const updateData: any = { status: newStatus };
      if (paymentMethod) {
        updateData.paymentMethod = paymentMethod;
        updateData.isPaid = true;
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'queues', q.id), updateData);
      await sendLineNotification(q, newStatus);
      setShowPaymentModal(false);
      setQueueToComplete(null);
      fetchQueues();
    } catch (e) {
      alert('อัปเดตไม่สำเร็จ');
    }
  };

  // ✅ ฟังก์ชันใช้โค้ดส่วนลด
  const applyDiscount = () => {
    setDiscountError('');
    if (!discountInput.trim()) return;

    const codeToApply = discountInput.trim().toUpperCase();
    const foundDiscount = availableDiscounts.find(
      (d) => d.code === codeToApply
    );

    if (!foundDiscount) {
      setDiscountError('โค้ดส่วนลดไม่ถูกต้อง');
      setAppliedDiscount(null);
      return;
    }

    const today = new Date().setHours(0, 0, 0, 0);
    const expiryDate = new Date(foundDiscount.expiry).setHours(0, 0, 0, 0);

    if (today > expiryDate) {
      setDiscountError('โค้ดส่วนลดนี้หมดอายุแล้ว');
      setAppliedDiscount(null);
      return;
    }

    setAppliedDiscount(foundDiscount);
    setDiscountError('');
  };

  const removeDiscount = () => {
    setAppliedDiscount(null);
    setDiscountInput('');
    setDiscountError('');
  };

  // ✅ คำนวณยอดสุทธิ
  const calculateTotal = () => {
    let rawTotal = baseServicePrice + calculatedFee;
    if (appliedDiscount) {
      rawTotal = Math.max(0, rawTotal - appliedDiscount.amount);
    }
    return rawTotal;
  };

  const handleAddOrEditQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeSlot) {
      alert('กรุณาเลือกเวลา');
      return;
    }
    if (!editingQueue && !foundUser) {
      alert('กรุณาค้นหาเบอร์ลูกค้าก่อนครับ');
      return;
    }
    setIsSaving(true);
    try {
      const carToBook = foundUser?.cars[Number(selectedCarIndex)];
      const data: any = {
        customerName: foundUser?.fullName || editingQueue?.customerName,
        customerPhone: foundUser?.phone || editingQueue?.customerPhone,
        carModel: carToBook?.carModel || editingQueue?.carModel,
        licensePlate: carToBook?.licensePlate || editingQueue?.licensePlate,
        province: carToBook?.province || editingQueue?.province || '-',
        carSize: currentCarSize,
        service,
        servicePrice: baseServicePrice,
        discountCode: appliedDiscount
          ? appliedDiscount.code
          : editingQueue?.discountCode || null,
        discountAmount: appliedDiscount
          ? appliedDiscount.amount
          : editingQueue?.discountAmount || 0,
        totalPrice: editingQueue
          ? baseServicePrice +
            calculatedFee -
            (editingQueue?.discountAmount || 0)
          : calculateTotal(),
        date: bookDate,
        timeSlot,
        note: bookNote,
        isPickup,
        pickupFee: calculatedFee,
        distance: isPickup ? distanceInput : 0,
      };

      if (editingQueue) {
        await updateDoc(doc(db, 'queues', editingQueue.id), data);
      } else {
        const now = new Date();
        const bookedAtString =
          now.toLocaleString('th-TH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          }) + ' น.';

        const queueNo = 'W' + Math.floor(100 + Math.random() * 900);
        await addDoc(collection(db, 'queues'), {
          ...data,
          queueNumber: queueNo,
          status: 'waiting',
          type: 'walk-in',
          bookedAt: bookedAtString,
          createdAt: serverTimestamp(),
        });

        // ✅ อัปเดตจำนวนครั้งการใช้งานของโค้ดส่วนลด
        if (appliedDiscount) {
          const updatedDiscounts = availableDiscounts.map((d) => {
            if (d.code === appliedDiscount.code) {
              return { ...d, usedCount: (d.usedCount || 0) + 1 };
            }
            return d;
          });
          await updateDoc(doc(db, 'settings', 'discounts'), {
            list: updatedDiscounts,
          });
        }
      }
      setShowAddModal(false);
      setEditingQueue(null);
      resetForm();
      fetchQueues();
    } catch (error) {
      alert('บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelQueue = async (id: string) => {
    if (window.confirm('ต้องการยกเลิกคิวนี้ใช่หรือไม่?')) {
      await updateDoc(doc(db, 'queues', id), { status: 'canceled' });
      fetchQueues();
      setShowAddModal(false);
      setEditingQueue(null);
      resetForm();
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('ยืนยันการลบข้อมูลคิวนี้ออกจากระบบถาวร?')) {
      try {
        await deleteDoc(doc(db, 'queues', id));
        fetchQueues();
      } catch (error) {
        alert('ลบข้อมูลไม่สำเร็จ');
      }
    }
  };

  const resetForm = () => {
    setFoundUser(null);
    setSearchPhone('');
    setSelectedCarIndex('0');
    setService(serviceList.length > 0 ? serviceList[0] : '');
    setBookDate(dates[0]);
    setTimeSlot('');
    setBookNote('');
    setIsPickup(false);
    setDistanceInput(0);
    setCurrentCarSize('S');
    setDiscountInput('');
    setAppliedDiscount(null);
    setDiscountError('');
  };

  const renderTimeSlotBtn = (slot: string) => {
    const isBooked = modalBookedSlots.includes(slot);
    const isSelected = timeSlot === slot;
    let isPassed = false;
    if (bookDate === dates[0]) {
      const now = new Date();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const [startHr, startMin] = slot.split(' - ')[0].split(':').map(Number);
      if (currentMins >= startHr * 60 + startMin) isPassed = true;
    }
    const isDisabled = isBooked || isPassed || isCheckingSlots;
    return (
      <button
        key={slot}
        type="button"
        disabled={isDisabled}
        onClick={() => setTimeSlot(slot)}
        className={`p-2 rounded-xl border-2 text-[10px] font-bold transition-all ${
          isDisabled
            ? 'bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed'
            : isSelected
            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md transform scale-105'
            : 'bg-white text-emerald-700 border-emerald-100 hover:border-emerald-400'
        }`}
      >
        {slot.split(' - ')[0]}
      </button>
    );
  };

  const displayQueues =
    filterDate === 'all'
      ? queues
      : queues.filter((q) => q.date.startsWith(filterDate));
  displayQueues.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));

  return (
    <div className="p-6 w-full h-full flex flex-col font-sans bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-800">
          ระบบจัดการคิวหลังบ้าน
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:bg-emerald-700 transition-all flex items-center"
        >
          <span className="mr-2">➕</span> เพิ่มคิวใหม่
        </button>
      </div>

      <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setFilterDate('all')}
          className={`flex-shrink-0 px-5 py-2 rounded-xl font-bold text-sm ${
            filterDate === 'all'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-500 border border-gray-200'
          }`}
        >
          ทั้งหมด
        </button>
        {dates.map((d) => (
          <button
            key={d}
            onClick={() => setFilterDate(d)}
            className={`flex-shrink-0 px-5 py-2 rounded-xl font-bold text-sm transition-all ${
              filterDate === d
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-emerald-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
              <tr className="text-gray-400 text-[10px] font-black uppercase tracking-widest">
                <th className="py-4 px-6">วัน/เวลา</th>
                <th className="py-4 px-6">คิว</th>
                <th className="py-4 px-6">ลูกค้า/รถ</th>
                <th className="py-4 px-6">บริการ / หมายเหตุ</th>
                <th className="py-4 px-6 text-center">สถานะ</th>
                <th className="py-4 px-6 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {displayQueues.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div className="text-xs text-emerald-600 font-bold">
                      {q.date}
                    </div>
                    <div className="font-black text-gray-700">
                      {q.timeSlot ? q.timeSlot.split(' - ')[0] : ''} น.
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-gray-800">
                        {q.queueNumber}
                      </span>
                      {q.createdAt && (
                        <div className="text-[9px] text-gray-400 font-bold leading-tight mt-1 flex flex-col">
                          <span>
                            📅 จอง:{' '}
                            {q.createdAt.toDate().toLocaleDateString('th-TH', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                          <span>
                            ⏰ เวลา:{' '}
                            {q.createdAt.toDate().toLocaleTimeString('th-TH', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            น.
                          </span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-bold text-gray-800">
                      {q.licensePlate}{' '}
                      <span className="text-gray-400 font-normal ml-1">
                        ({q.customerName})
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400">
                      {q.carModel}{' '}
                      <span className="bg-gray-200 px-1 rounded ml-1 text-[8px] font-bold">
                        Size: {q.carSize || 'S'}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-6 align-top">
                    <div className="text-sm font-bold text-gray-600">
                      {q.service}{' '}
                      <span className="text-emerald-600 text-[10px] ml-1">
                        (฿{q.servicePrice || 0})
                      </span>
                    </div>
                    {q.isPickup && (
                      <div className="text-[9px] text-orange-500 font-bold mt-1">
                        🚚 รับรถ (+฿{q.pickupFee})
                      </div>
                    )}
                    {q.discountCode && (
                      <div className="text-[9px] text-red-500 font-bold mt-1">
                        🎟️ ส่วนลด (-฿{q.discountAmount})
                      </div>
                    )}
                    {q.note && (
                      <div className="mt-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-1.5 rounded-lg block whitespace-normal max-w-[200px] leading-tight border border-emerald-100">
                        📝 {q.note}
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-center">
                    {q.status === 'waiting' && (
                      <span className="px-3 py-1 text-[10px] rounded-full font-bold bg-amber-100 text-amber-600">
                        รอล้าง
                      </span>
                    )}
                    {q.status === 'in_progress' && (
                      <span className="px-3 py-1 text-[10px] rounded-full font-bold bg-blue-100 text-blue-600 animate-pulse">
                        กำลังล้าง
                      </span>
                    )}
                    {q.status === 'completed' && (
                      <span className="px-3 py-1 text-[10px] rounded-full font-bold bg-gray-100 text-gray-400">
                        เสร็จสิ้น ({q.paymentMethod || '-'})
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right space-x-2">
                    {q.status === 'waiting' && (
                      <button
                        onClick={() => handleUpdateStatus(q, 'in_progress')}
                        className="bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-600"
                      >
                        เรียกคิว
                      </button>
                    )}
                    {q.status === 'in_progress' && (
                      <button
                        onClick={() => handleUpdateStatus(q, 'completed')}
                        className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-emerald-600"
                      >
                        เสร็จงาน
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingQueue(q);
                        setBookDate(q.date);
                        setTimeSlot(q.timeSlot);
                        setService(q.service);
                        setIsPickup(q.isPickup || false);
                        setDistanceInput(q.distance || 0);
                        setBookNote(q.note || '');
                      }}
                      className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-200"
                    >
                      📝 แก้ไข
                    </button>
                    {q.status !== 'completed' && (
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-red-400 hover:text-red-600 px-2 py-1 font-bold"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Payment Selection Modal */}
      {showPaymentModal && queueToComplete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-xl font-black text-gray-800 mb-2">
              💰 บันทึกการชำระเงิน
            </h3>
            <p className="text-xs text-gray-400 mb-6 uppercase tracking-widest">
              คิว {queueToComplete.queueNumber} | ฿{queueToComplete.totalPrice}
            </p>
            <div className="grid grid-cols-1 gap-3">
              {paymentMethods.map((method) => (
                <button
                  key={method}
                  onClick={() =>
                    handleUpdateStatus(queueToComplete, 'completed', method)
                  }
                  className="py-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black border-2 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                >
                  {method}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowPaymentModal(false);
                setQueueToComplete(null);
              }}
              className="mt-6 text-gray-400 font-bold text-sm"
            >
              ย้อนกลับ
            </button>
          </div>
        </div>
      )}

      {(showAddModal || editingQueue) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 bg-gray-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-xl">
                {editingQueue
                  ? `📝 แก้ไขคิว ${editingQueue.queueNumber}`
                  : '➕ เพิ่มคิวใหม่'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingQueue(null);
                  resetForm();
                }}
                className="text-2xl hover:text-gray-300"
              >
                &times;
              </button>
            </div>
            <div className="p-6 overflow-y-auto bg-gray-50 space-y-4 text-left">
              {!editingQueue && (
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-left">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-2">
                    1. ค้นหาลูกค้า
                  </label>
                  <div className="flex gap-2 text-left">
                    <input
                      type="tel"
                      placeholder="เบอร์โทรศัพท์"
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      className="flex-1 p-2 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const snap = await getDocs(
                          query(
                            collection(db, 'users'),
                            where('phone', '==', searchPhone)
                          )
                        );
                        if (!snap.empty) {
                          const d = snap.docs[0].data();
                          setFoundUser({
                            ...d,
                            cars: d.cars || [
                              {
                                carModel: d.carModel,
                                licensePlate: d.licensePlate,
                                province: d.province,
                              },
                            ],
                          });
                        } else alert('ไม่พบสมาชิก');
                      }}
                      className="bg-gray-800 text-white px-4 rounded-xl font-bold"
                    >
                      ค้นหา
                    </button>
                  </div>
                  {foundUser && (
                    <div className="mt-3 p-3 bg-emerald-50 rounded-xl text-xs font-bold text-emerald-700">
                      คุณ {foundUser.fullName} | {foundUser.phone}
                    </div>
                  )}
                </div>
              )}

              <div
                className={`bg-white p-4 rounded-2xl border shadow-sm space-y-4 ${
                  editingQueue?.status === 'completed'
                    ? 'border-gray-200 opacity-80 pointer-events-none'
                    : 'border-gray-100'
                }`}
              >
                <div className="space-y-4">
                  {!editingQueue && foundUser && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 flex justify-between">
                        <span>เลือกรถ</span>
                        <span className="text-emerald-600 bg-emerald-50 px-2 rounded">
                          Size: {currentCarSize}
                        </span>
                      </label>
                      <select
                        value={selectedCarIndex}
                        onChange={(e) => setSelectedCarIndex(e.target.value)}
                        className="w-full p-2 border rounded-xl bg-white text-sm font-bold"
                      >
                        {foundUser.cars.map((c: any, i: number) => (
                          <option key={i} value={i}>
                            {c.carModel} ({c.licensePlate} {c.province})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  {editingQueue && (
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 mb-1 flex justify-between">
                        <span>ข้อมูลรถ</span>
                        <span className="text-emerald-600 bg-emerald-50 px-2 rounded">
                          Size: {currentCarSize}
                        </span>
                      </label>
                      <div className="w-full p-2 border border-gray-200 rounded-xl bg-gray-50 text-sm font-bold text-gray-600">
                        {editingQueue.carModel} ({editingQueue.licensePlate}{' '}
                        {editingQueue.province})
                      </div>
                    </div>
                  )}
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 mb-1 flex justify-between">
                      <span>ประเภทบริการ</span>
                      <span className="text-emerald-600">
                        ราคา: ฿{baseServicePrice}
                      </span>
                    </label>
                    <select
                      value={service}
                      onChange={(e) => setService(e.target.value)}
                      className="w-full p-2 border rounded-xl bg-white text-sm font-bold"
                    >
                      {serviceList.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ✅ ส่วนลด (เฉพาะสร้างคิวใหม่) */}
                {!editingQueue && (
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase text-left">
                      🎟️ โค้ดส่วนลด
                    </label>
                    {!appliedDiscount ? (
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={discountInput}
                            onChange={(e) =>
                              setDiscountInput(e.target.value.toUpperCase())
                            }
                            placeholder="กรอกโค้ดส่วนลด"
                            className="flex-1 p-2 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 uppercase outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={applyDiscount}
                            className="bg-gray-800 text-white px-4 rounded-xl font-bold text-sm"
                          >
                            ใช้โค้ด
                          </button>
                        </div>
                        {discountError && (
                          <p className="text-red-500 text-xs font-bold mt-2">
                            {discountError}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-emerald-100">
                        <span className="font-black text-emerald-600 text-sm">
                          {appliedDiscount.code} (-฿{appliedDiscount.amount})
                        </span>
                        <button
                          type="button"
                          onClick={removeDiscount}
                          className="text-red-400 text-xs font-bold px-2 py-1 bg-red-50 rounded-lg"
                        >
                          ยกเลิก
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 flex justify-between items-center">
                  <label className="text-sm font-bold text-orange-800">
                    🚚 บริการไปรับรถที่บ้าน (+฿{calculatedFee})
                  </label>
                  <div className="flex items-center gap-4">
                    {isPickup && (
                      <input
                        type="number"
                        step="0.1"
                        value={distanceInput}
                        onChange={(e) =>
                          setDistanceInput(Number(e.target.value))
                        }
                        className="w-20 p-1 border rounded-lg text-sm"
                        placeholder="กม."
                      />
                    )}
                    <input
                      type="checkbox"
                      checked={isPickup}
                      onChange={(e) => setIsPickup(e.target.checked)}
                      className="w-5 h-5 accent-orange-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase text-left">
                    เลือกวันและเวลา {isCheckingSlots && '⏳'}
                  </label>
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-hide">
                    {dates.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setBookDate(d);
                          setTimeSlot('');
                        }}
                        className={`flex-shrink-0 px-4 py-2 rounded-xl border-2 text-xs font-bold ${
                          bookDate === d
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-gray-100 text-gray-400'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-6 gap-1 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                    {allSlots.map(renderTimeSlotBtn)}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">
                    หมายเหตุ
                  </label>
                  <textarea
                    value={bookNote}
                    onChange={(e) => setBookNote(e.target.value)}
                    rows={2}
                    className="w-full p-2 border rounded-xl text-sm"
                    placeholder="เช่น เน้นตรงไหนเป็นพิเศษ..."
                  />
                </div>
              </div>
            </div>

            {/* ✅ สรุปราคาก่อนกดบันทึก */}
            <div className="p-6 bg-white border-t border-gray-100 flex flex-col gap-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                <span className="text-xs font-bold text-gray-500">
                  ยอดสุทธิที่ต้องชำระ:
                </span>
                <span className="text-xl font-black text-emerald-600">
                  ฿{calculateTotal()}
                </span>
              </div>
              <div className="flex gap-3">
                {editingQueue && editingQueue.status !== 'completed' && (
                  <button
                    type="button"
                    onClick={() => handleCancelQueue(editingQueue.id)}
                    className="px-6 py-3 rounded-2xl font-bold text-red-500 bg-red-50 hover:bg-red-100 border border-red-100 transition-all"
                  >
                    ยกเลิกคิวนี้
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleAddOrEditQueue}
                  disabled={
                    isSaving ||
                    !timeSlot ||
                    editingQueue?.status === 'completed' ||
                    (!editingQueue && !foundUser)
                  }
                  className={`flex-1 py-3 px-4 rounded-2xl font-bold text-white shadow-lg transition-all text-lg flex justify-center items-center ${
                    isSaving ||
                    !timeSlot ||
                    editingQueue?.status === 'completed' ||
                    (!editingQueue && !foundUser)
                      ? 'bg-gray-300 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  <span>
                    {isSaving
                      ? 'กำลังบันทึก...'
                      : editingQueue
                      ? editingQueue.status === 'completed'
                        ? 'คิวเสร็จสิ้นแล้ว'
                        : 'บันทึกการแก้ไข'
                      : '🚀 ยืนยันเพิ่มคิว'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Queue;
