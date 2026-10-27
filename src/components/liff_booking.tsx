import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  collection,
  addDoc,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

const SHOP_LOCATION = { lat: 13.823, lng: 100.476 };

const thaiProvinces = [
  'กรุงเทพมหานคร',
  'กระบี่',
  'กาญจนบุรี',
  'กาฬสินธุ์',
  'กำแพงเพชร',
  'ขอนแก่น',
  'จันทบุรี',
  'ฉะเชิงเทรา',
  'ชลบุรี',
  'ชัยนาท',
  'ชัยภูมิ',
  'ชุมพร',
  'เชียงราย',
  'เชียงใหม่',
  'ตรัง',
  'ตราด',
  'ตาก',
  'นครนายก',
  'นครปฐม',
  'นครพนม',
  'นครราชสีมา',
  'นครศรีธรรมราช',
  'นครสวรรค์',
  'นนทบุรี',
  'นราธิวาส',
  'น่าน',
  'บึงกาฬ',
  'บุรีรัมย์',
  'ปทุมธานี',
  'ประจวบคีรีขันธ์',
  'ปราจีนบุรี',
  'ปัตตานี',
  'พระนครศรีอยุธยา',
  'พะเยา',
  'พังงา',
  'พัทลุง',
  'พิจิตร',
  'พิษณุโลก',
  'เพชรบุรี',
  'เพชรบูรณ์',
  'แพร่',
  'ภูเก็ต',
  'มหาสารคาม',
  'มุกดาหาร',
  'แม่ฮ่องสอน',
  'ยโสธร',
  'ยะลา',
  'ร้อยเอ็ด',
  'ระนอง',
  'ระยอง',
  'ราชบุรี',
  'ลพบุรี',
  'ลำปาง',
  'ลำพูน',
  'เลย',
  'ศรีสะเกษ',
  'สกลนคร',
  'สงขลา',
  'สตูล',
  'สมุทรปราการ',
  'สมุทรสงคราม',
  'สมุทรสาคร',
  'สระแก้ว',
  'สระบุรี',
  'สิงห์บุรี',
  'สุโขทัย',
  'สุพรรณบุรี',
  'สุราษฎร์ธานี',
  'สุรินทร์',
  'หนองคาย',
  'หนองบัวลำภู',
  'อ่างทอง',
  'อำนาจเจริญ',
  'อุดรธานี',
  'อุตรดิตถ์',
  'อุทัยธานี',
  'อุบลราชธานี',
  'เบตง (ป้ายทะเบียนพิเศษ)',
];

const carColors = [
  'ขาว',
  'ดำ',
  'เทา/บรอนซ์',
  'เงิน',
  'แดง',
  'น้ำเงิน',
  'น้ำตาล',
  'เหลือง',
  'เขียว',
  'อื่นๆ',
];

interface CarData {
  carModel: string;
  licensePlate: string;
  province: string;
}

const getFormattedDate = (daysToAdd: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysToAdd);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
};

const getFullFormattedDate = (shortDateStr: string) => {
  for (let i = -5; i < 15; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    if (
      d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) ===
      shortDateStr
    ) {
      return d.toLocaleDateString('th-TH', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  }
  return shortDateStr;
};

const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const LiffBooking: React.FC = () => {
  const liffId = '2009711737-KCfmze4b';
  const [liffProfile, setLiffProfile] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [view, setView] = useState<
    'loading' | 'not_registered' | 'booking' | 'ticket'
  >('loading');
  const [showWarningModal, setShowWarningModal] = useState(false);

  const [carDataFromDB, setCarDataFromDB] = useState<
    Record<string, { model: string; size: string }[]>
  >({});
  const [pricingDB, setPricingDB] = useState<
    Record<string, Record<string, number>>
  >({});
  const [serviceList, setServiceList] = useState<string[]>([]);
  const [currentCarSize, setCurrentCarSize] = useState<string>('S');
  const [baseServicePrice, setBaseServicePrice] = useState<number>(0);

  const [isPickupService, setIsPickupService] = useState(false);
  const [distance, setDistance] = useState<number | null>(null);
  const [pickupFee, setPickupFee] = useState(0);

  const [userCars, setUserCars] = useState<CarData[]>([]);
  const [selectedCarIndex, setSelectedCarIndex] = useState<string>('0');

  const [newCarBrand, setNewCarBrand] = useState('');
  const [newCarModelSelect, setNewCarModelSelect] = useState('');
  const [newCarColor, setNewCarColor] = useState('ขาว');
  const [newCarCustomModel, setNewCarCustomModel] = useState('');
  const [newLicensePlate, setNewLicensePlate] = useState('');
  const [newProvince, setNewProvince] = useState('กรุงเทพมหานคร');

  const [bookService, setBookService] = useState('');
  const [bookDate, setBookDate] = useState('');
  const [bookTime, setBookTime] = useState('');
  const [bookNote, setBookNote] = useState('');
  const [waitStatus, setWaitStatus] = useState<'wait' | 'leave' | ''>('');

  const [ticketData, setTicketData] = useState<any>(null);
  const [isBookingProcess, setIsBookingProcess] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isCheckingSlots, setIsCheckingSlots] = useState(false);

  // ✅ State สำหรับระบบส่วนลด
  const [availableDiscounts, setAvailableDiscounts] = useState<any[]>([]);
  const [discountInput, setDiscountInput] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<any>(null);
  const [discountError, setDiscountError] = useState('');

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

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const carSnap = await getDoc(doc(db, 'settings', 'carModels'));
        if (carSnap.exists() && carSnap.data().brands) {
          const brands = carSnap.data().brands;
          setCarDataFromDB(brands);
          const firstBrand = Object.keys(brands)[0];
          if (firstBrand) {
            setNewCarBrand(firstBrand);
            setNewCarModelSelect(brands[firstBrand][0]?.model || '');
          }
        }
        const priceSnap = await getDoc(doc(db, 'settings', 'pricing'));
        if (priceSnap.exists() && priceSnap.data().services) {
          const svcs = priceSnap.data().services;
          setPricingDB(svcs);
          const svcKeys = Object.keys(svcs);
          setServiceList(svcKeys);
          if (svcKeys.length > 0) setBookService(svcKeys[0]);
        }

        // ✅ ดึงข้อมูลโค้ดส่วนลดจาก Firebase
        const discountSnap = await getDoc(doc(db, 'settings', 'discounts'));
        if (discountSnap.exists() && discountSnap.data().list) {
          setAvailableDiscounts(discountSnap.data().list);
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      }
    };
    fetchSettings();
  }, []);

  useEffect(() => {
    if (carDataFromDB[newCarBrand] && carDataFromDB[newCarBrand].length > 0) {
      setNewCarModelSelect(carDataFromDB[newCarBrand][0].model);
    }
  }, [newCarBrand, carDataFromDB]);

  useEffect(() => {
    let searchModel = '';
    if (selectedCarIndex === 'new') {
      searchModel = newCarModelSelect;
    } else if (userCars[Number(selectedCarIndex)]) {
      searchModel = userCars[Number(selectedCarIndex)].carModel;
    }
    let foundSize = 'S';
    for (const brand in carDataFromDB) {
      for (const item of carDataFromDB[brand]) {
        if (searchModel.includes(item.model)) {
          foundSize = item.size;
          break;
        }
      }
    }
    setCurrentCarSize(foundSize);
  }, [selectedCarIndex, newCarModelSelect, userCars, carDataFromDB]);

  useEffect(() => {
    if (bookService && pricingDB[bookService]) {
      setBaseServicePrice(pricingDB[bookService][currentCarSize] || 0);
    } else {
      setBaseServicePrice(0);
    }
  }, [bookService, currentCarSize, pricingDB]);

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
        const docRef = doc(db, 'users', profile.userId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          if (data.cars && Array.isArray(data.cars) && data.cars.length > 0) {
            setUserCars(data.cars);
          } else if (data.carModel) {
            setUserCars([
              {
                carModel: data.carModel,
                licensePlate: data.licensePlate,
                province: data.province,
              },
            ]);
          }
          const activeQueueQuery = query(
            collection(db, 'queues'),
            where('userId', '==', profile.userId),
            where('status', '==', 'waiting')
          );
          const activeQueueSnap = await getDocs(activeQueueQuery);
          if (!activeQueueSnap.empty) setShowWarningModal(true);
          setView('booking');
        } else {
          setView('not_registered');
        }
      } catch (error) {
        setView('not_registered');
      }
    };
    initLiff();
  }, []);

  useEffect(() => {
    if (!bookDate) return;
    const fetchAvailableSlots = async () => {
      setIsCheckingSlots(true);
      try {
        const q = query(
          collection(db, 'queues'),
          where('date', '==', bookDate)
        );
        const querySnapshot = await getDocs(q);
        const booked: string[] = [];
        querySnapshot.forEach((doc) => {
          if (doc.data().status !== 'canceled')
            booked.push(doc.data().timeSlot);
        });
        setBookedSlots(booked);
        if (booked.includes(bookTime)) setBookTime('');
      } catch (error) {
        console.error(error);
      } finally {
        setIsCheckingSlots(false);
      }
    };
    fetchAvailableSlots();
  }, [bookDate]);

  const handleTogglePickup = () => {
    if (!isPickupService) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const dist = calculateDistance(
              SHOP_LOCATION.lat,
              SHOP_LOCATION.lng,
              position.coords.latitude,
              position.coords.longitude
            );
            setDistance(dist);
            let fee = dist <= 5 ? 50 : dist <= 10 ? 80 : 0;
            setPickupFee(fee);
            setIsPickupService(true);
          },
          () => {
            alert(
              '❌ ไม่สามารถดึงพิกัดได้\nกรุณาอนุญาตการเข้าถึงตำแหน่งที่ตั้ง'
            );
            setIsPickupService(false);
          },
          { enableHighAccuracy: true }
        );
      } else {
        alert('อุปกรณ์ของคุณไม่รองรับการดึงพิกัด GPS ครับ');
      }
    } else {
      setIsPickupService(false);
      setDistance(null);
      setPickupFee(0);
    }
  };

  const getFinalCarModelString = () => {
    let finalModel = `${newCarBrand} ${newCarModelSelect}`;
    if (
      newCarBrand === 'อื่นๆ' ||
      newCarModelSelect.includes('อื่นๆ') ||
      newCarModelSelect.includes('ระบุรุ่นรถ')
    ) {
      finalModel =
        newCarCustomModel.trim() !== '' ? newCarCustomModel : finalModel;
    }
    return `${finalModel} สี${newCarColor}`;
  };

  // ✅ ฟังก์ชันตรวจสอบและใช้โค้ดส่วนลด
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

  // ✅ คำนวณราคาสุทธิที่ลดแล้ว
  const calculateTotal = () => {
    let rawTotal = baseServicePrice + pickupFee;
    if (isPickupService && distance && distance > 10) {
      // ถ้าระยะเกิน 10 กม. เรายังไม่คิดรวมค่ารับส่งในยอดนี้
      rawTotal = baseServicePrice;
    }
    if (appliedDiscount) {
      rawTotal = Math.max(0, rawTotal - appliedDiscount.amount); // ไม่ให้ยอดรวมติดลบ
    }
    return rawTotal;
  };

  const handleBooking = async () => {
    if (!waitStatus) {
      alert('กรุณาเลือกความประสงค์ในการรับรถ');
      return;
    }
    setIsBookingProcess(true);
    try {
      let carToBook: CarData;
      if (selectedCarIndex === 'new') {
        carToBook = {
          carModel: getFinalCarModelString(),
          licensePlate: newLicensePlate,
          province: newProvince,
        };
        await updateDoc(doc(db, 'users', liffProfile.userId), {
          cars: arrayUnion(carToBook),
        });
        setUserCars([...userCars, carToBook]);
      } else {
        carToBook = userCars[Number(selectedCarIndex)];
      }

      const newQueueNumber =
        'A' + Math.floor(100 + Math.random() * 900).toString();

      const waitText =
        waitStatus === 'wait'
          ? '[ลูกค้าจะรอรับรถที่ร้าน]'
          : '[ทิ้งรถไว้ ไม่รอรับ]';
      const finalNote = `${waitText} ${bookNote}`.trim();

      const now = new Date();
      const bookedAtString =
        now.toLocaleString('th-TH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }) + ' น.';

      // ✅ เพิ่มข้อมูลส่วนลดลงใน Queue Data
      const newQueueData = {
        queueNumber: newQueueNumber,
        customerName:
          userData?.fullName || liffProfile?.displayName || 'ลูกค้า',
        customerPhone: userData?.phone || '-',
        carModel: carToBook.carModel,
        licensePlate: carToBook.licensePlate,
        province: carToBook.province,
        carSize: currentCarSize,
        service: bookService,
        servicePrice: baseServicePrice,
        discountCode: appliedDiscount ? appliedDiscount.code : null, // เก็บโค้ด
        discountAmount: appliedDiscount ? appliedDiscount.amount : 0, // เก็บยอดลด
        totalPrice: calculateTotal(), // ยอดสุทธิ
        date: bookDate,
        timeSlot: bookTime,
        note: finalNote,
        waitStatus: waitStatus,
        status: 'waiting',
        userId: liffProfile?.userId || 'test_user',
        isPickup: isPickupService,
        pickupFee: pickupFee,
        distance: distance?.toFixed(2) || 0,
        createdAt: serverTimestamp(),
        bookedAt: bookedAtString,
      };

      await addDoc(collection(db, 'queues'), newQueueData);

      // ✅ อัปเดตจำนวนการใช้งานของโค้ดนั้น (เพิ่มทีละ 1)
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

      setTicketData({ ...newQueueData });
      setView('ticket');
    } catch (error) {
      alert('เกิดข้อผิดพลาด ไม่สามารถจองคิวได้');
    } finally {
      setIsBookingProcess(false);
    }
  };

  const renderTimeSlotBtn = (slot: string) => {
    const isBooked = bookedSlots.includes(slot);
    const isSelected = bookTime === slot;
    let isPassed = false;
    if (bookDate === dates[0]) {
      const now = new Date();
      const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMinute] = slot
        .split(' - ')[0]
        .split(':')
        .map(Number);
      if (currentTotalMinutes >= startHour * 60 + startMinute) isPassed = true;
    }
    const isDisabled = isBooked || isCheckingSlots || isPassed;

    return (
      <button
        key={slot}
        disabled={isDisabled}
        onClick={() => setBookTime(slot)}
        className={`relative p-2 rounded-xl border-2 text-center transition-all ${
          isDisabled
            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            : isSelected
            ? 'bg-emerald-600 border-emerald-600 text-white shadow-md'
            : 'bg-white border-emerald-100 text-emerald-700 hover:border-emerald-400'
        }`}
      >
        <div className={`font-black text-sm ${isDisabled ? 'opacity-50' : ''}`}>
          {slot.split(' - ')[0]}
        </div>
        {isBooked && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-70 backdrop-blur-[1px]">
            <span className="bg-gray-500 text-white text-[9px] px-1 py-0.5 rounded font-bold transform -rotate-12">
              เต็ม
            </span>
          </div>
        )}
      </button>
    );
  };

  const isFormComplete = () => {
    if (
      bookService === '' ||
      bookDate === '' ||
      bookTime === '' ||
      waitStatus === ''
    )
      return false;
    if (selectedCarIndex === 'new') {
      if (newLicensePlate === '') return false;
    }
    return true;
  };

  const handleCloseLiff = () => {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      alert('กรุณาปิดหน้าต่างนี้เพื่อกลับไปที่ LINE');
    }
  };

  const renderCarInputForm = () => (
    <div className="space-y-3 text-left">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            ยี่ห้อรถ *
          </label>
          <select
            value={newCarBrand}
            onChange={(e) => setNewCarBrand(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {Object.keys(carDataFromDB).map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1">
            รุ่นรถ *
          </label>
          <select
            value={newCarModelSelect}
            onChange={(e) => setNewCarModelSelect(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {carDataFromDB[newCarBrand]?.map((item, idx) => (
              <option key={idx} value={item.model}>
                {item.model} (Size: {item.size})
              </option>
            ))}
          </select>
        </div>
      </div>
      {(newCarBrand === 'อื่นๆ' || newCarModelSelect.includes('อื่นๆ')) && (
        <input
          type="text"
          value={newCarCustomModel}
          onChange={(e) => setNewCarCustomModel(e.target.value)}
          className="w-full p-2.5 border border-emerald-300 bg-emerald-50 rounded-lg text-sm"
          placeholder="โปรดระบุยี่ห้อ/รุ่นรถ..."
        />
      )}
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-1">
          <label className="block text-xs font-bold text-gray-500 mb-1">
            สีรถ *
          </label>
          <select
            value={newCarColor}
            onChange={(e) => setNewCarColor(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            {carColors.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-gray-500 mb-1">
            ทะเบียนรถ *
          </label>
          <input
            type="text"
            value={newLicensePlate}
            onChange={(e) => setNewLicensePlate(e.target.value)}
            className="w-full p-2.5 border border-gray-300 rounded-lg text-sm"
            placeholder="เช่น กข 1234"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 mb-1">
          จังหวัด *
        </label>
        <select
          value={newProvince}
          onChange={(e) => setNewProvince(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {thaiProvinces.map((prov) => (
            <option key={prov} value={prov}>
              {prov}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  if (view === 'loading')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );

  if (view === 'not_registered')
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4 text-center">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 border border-gray-100">
          <div className="w-20 h-20 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6">
            !
          </div>
          <h2 className="text-xl font-black text-gray-800 mb-3">
            ยังไม่ได้สมัครสมาชิก
          </h2>
          <button
            onClick={handleCloseLiff}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-gray-800"
          >
            กลับไปที่หน้าแชท LINE
          </button>
        </div>
      </div>
    );

  if (view === 'booking') {
    if (showWarningModal) {
      return (
        <div className="min-h-screen bg-gray-100 flex justify-center items-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center animate-fade-in">
            <div className="w-20 h-20 bg-amber-100 text-yellow-500 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 text-center">
              ⚠️
            </div>
            <h2 className="text-xl font-black text-gray-800 mb-3">
              คุณมีการจองคิวไว้แล้ว!
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setShowWarningModal(false)}
                className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600"
              >
                ดำเนินการต่อ (จองคันอื่นเพิ่ม)
              </button>
              <button
                onClick={handleCloseLiff}
                className="w-full py-3.5 rounded-xl font-bold text-gray-600 bg-gray-100"
              >
                กลับไปที่เมนูหลัก
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
        <div className="w-full max-w-md bg-white min-h-screen shadow-lg relative flex flex-col">
          <div className="bg-emerald-600 text-white p-4 flex justify-between items-center shadow-md z-10">
            <div>
              <div className="font-bold text-lg text-left">จองคิวล้างรถ</div>
              <div className="text-xs text-emerald-100">
                คุณ {userData?.fullName}
              </div>
            </div>
            {liffProfile?.pictureUrl && (
              <img
                src={liffProfile.pictureUrl}
                referrerPolicy="no-referrer"
                alt="profile"
                className="w-10 h-10 rounded-full border-2 border-white object-cover"
              />
            )}
          </div>

          <div className="p-5 pb-40 flex-1 overflow-y-auto space-y-6">
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100 overflow-hidden">
              <div className="flex justify-between items-center mb-3">
                <div className="text-left">
                  <h3 className="font-bold text-gray-800 flex items-center">
                    <span className="mr-2">🚚</span> บริการไปรับรถที่บ้าน
                  </h3>
                  <p className="text-[10px] text-gray-400 italic">
                    คำนวณค่าบริการตามระยะทางอัตโนมัติ
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPickupService}
                    onChange={handleTogglePickup}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>
              {isPickupService && distance !== null && (
                <div className="animate-fade-in bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                  <div className="flex justify-between text-sm text-left">
                    <span className="text-gray-600">ระยะทางจากร้าน:</span>
                    <span className="font-bold text-emerald-700">
                      {distance.toFixed(2)} กม.
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1 border-t border-emerald-100 pt-1 items-center">
                    <span className="text-gray-600">ค่าบริการไปรับรถ:</span>
                    {distance > 10 ? (
                      <span className="font-bold text-orange-600 text-xs animate-pulse text-right">
                        ⚠️ ตรวจสอบราคากับทางร้าน
                      </span>
                    ) : (
                      <span className="font-black text-emerald-700 text-lg text-right">
                        ฿{pickupFee}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 shadow-sm">
              <h3 className="text-md font-bold mb-3 text-emerald-800 flex justify-between items-center">
                <span>🚗 1. เลือกรถที่จะจอง</span>
                <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-1 rounded-lg">
                  Size: {currentCarSize}
                </span>
              </h3>
              <select
                value={selectedCarIndex}
                onChange={(e) => setSelectedCarIndex(e.target.value)}
                className="w-full p-3 border border-emerald-300 rounded-xl bg-white font-medium text-gray-700 shadow-sm outline-none"
              >
                {userCars.map((car, idx) => (
                  <option key={idx} value={idx}>
                    {car.carModel} ({car.licensePlate} {car.province})
                  </option>
                ))}
                <option value="new" className="font-bold text-emerald-600">
                  ➕ นำรถคันใหม่มาจอง...
                </option>
              </select>
              {selectedCarIndex === 'new' && (
                <div className="mt-4 p-4 bg-white border border-emerald-100 rounded-xl animate-fade-in shadow-inner">
                  {renderCarInputForm()}
                </div>
              )}
            </div>

            <div className="text-left">
              <h3 className="text-md font-bold mb-3 text-gray-800">
                2. เลือกประเภทบริการ
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {serviceList.map((s) => {
                  const priceForThisService =
                    pricingDB[s]?.[currentCarSize] || 0;
                  return (
                    <button
                      key={s}
                      onClick={() => setBookService(s)}
                      className={`flex flex-col items-center justify-center py-3 px-2 rounded-xl border-2 transition-all ${
                        bookService === s
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 text-gray-600 bg-white'
                      }`}
                    >
                      <div className="font-bold text-sm leading-tight text-center">
                        {s}
                      </div>
                      <div
                        className={`mt-1 text-xs ${
                          bookService === s ? 'font-black' : 'font-medium'
                        }`}
                      >
                        ฿{priceForThisService}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ✅ กล่องกรอกโค้ดส่วนลด */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm text-left">
              <h3 className="text-md font-bold mb-3 text-gray-800 flex items-center">
                <span className="mr-2">🎟️</span> โค้ดส่วนลด (ถ้ามี)
              </h3>
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
                      className="flex-1 p-3 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 uppercase outline-none focus:border-emerald-500"
                    />
                    <button
                      onClick={applyDiscount}
                      className="bg-gray-800 text-white px-5 rounded-xl font-bold text-sm active:scale-95 transition-transform"
                    >
                      ใช้โค้ด
                    </button>
                  </div>
                  {discountError && (
                    <p className="text-red-500 text-xs font-bold mt-2 ml-1">
                      {discountError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-xl border border-emerald-200 animate-fade-in">
                  <div>
                    <span className="text-xs text-gray-500 block">
                      ใช้งานโค้ดแล้ว:
                    </span>
                    <span className="font-black text-emerald-700 tracking-widest">
                      {appliedDiscount.code}{' '}
                      <span className="text-xs bg-emerald-200 px-1.5 py-0.5 rounded text-emerald-800 ml-1">
                        -฿{appliedDiscount.amount}
                      </span>
                    </span>
                  </div>
                  <button
                    onClick={removeDiscount}
                    className="text-red-400 font-bold text-xs bg-white px-3 py-1.5 rounded-lg shadow-sm border border-red-100 hover:text-red-600"
                  >
                    ยกเลิก
                  </button>
                </div>
              )}
            </div>

            <div className="text-left">
              <h3 className="text-md font-bold mb-3 text-gray-800 tracking-tight">
                3. เลือกวันที่และเวลาเริ่มต้น
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-4">
                {dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => {
                      setBookDate(d);
                      setBookTime('');
                    }}
                    className={`flex-shrink-0 w-16 py-3 rounded-xl border-2 transition-all ${
                      bookDate === d
                        ? 'border-emerald-600 bg-emerald-600 text-white font-bold'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    <div className="text-sm font-black">{d.split(' ')[0]}</div>
                    <div className="text-[10px] opacity-80">
                      {d.split(' ')[1]}
                    </div>
                  </button>
                ))}
              </div>
              <div className="space-y-4">
                {bookDate && (
                  <div className="bg-gray-50 p-4 rounded-xl">
                    <div className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-tighter">
                      เลือกเวลาที่ต้องการนำรถเข้า (Booking Time)
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {[...morningSlots, ...afternoonSlots].map(
                        renderTimeSlotBtn
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {bookTime && (
              <div className="animate-fade-in bg-white p-5 rounded-2xl border-2 border-emerald-100 shadow-sm text-left">
                <h3 className="text-md font-bold mb-4 text-emerald-800 flex items-center">
                  <span className="mr-2">⌛</span> 4. ความประสงค์ในการรับรถ
                </h3>
                <div className="space-y-3">
                  <label
                    className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      waitStatus === 'wait'
                        ? 'border-emerald-500 bg-emerald-50 shadow-sm'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="waitStatus"
                      value="wait"
                      checked={waitStatus === 'wait'}
                      onChange={() => setWaitStatus('wait')}
                      className="w-5 h-5 accent-emerald-600 mr-3"
                    />
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        ฉันจะนั่งรอรับรถที่ร้าน
                      </div>
                      <p className="text-[10px] text-gray-500">
                        พนักงานจะพยายามเร่งคิวให้เร็วที่สุด
                      </p>
                    </div>
                  </label>
                  <label
                    className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      waitStatus === 'leave'
                        ? 'border-orange-500 bg-orange-50 shadow-sm'
                        : 'border-gray-100 bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="waitStatus"
                      value="leave"
                      checked={waitStatus === 'leave'}
                      onChange={() => setWaitStatus('leave')}
                      className="w-5 h-5 accent-orange-600 mr-3"
                    />
                    <div>
                      <div className="font-bold text-gray-800 text-sm">
                        ทิ้งรถไว้ (ทำธุระอื่น)
                      </div>
                      <p className="text-[10px] text-gray-500">
                        เสร็จแล้วจะกลับมารับ หรือให้แจ้งผ่าน LINE
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {bookTime && waitStatus && (
              <div className="animate-fade-in bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-left">
                <label className="block text-sm font-bold text-emerald-800 mb-2">
                  📝 หมายเหตุเพิ่มเติม (ถ้ามี)
                </label>
                <textarea
                  value={bookNote}
                  onChange={(e) => setBookNote(e.target.value)}
                  rows={2}
                  className="w-full p-3 border border-emerald-200 rounded-lg outline-none text-sm bg-white"
                  placeholder="เช่น เน้นล้อ, ดูดฝุ่นขนแมว ฯลฯ"
                />
              </div>
            )}
          </div>

          <div className="absolute bottom-0 left-0 w-full bg-white border-t border-gray-100 shadow-[0_-15px_20px_-5px_rgba(0,0,0,0.05)] z-20">
            {/* ✅ สรุปยอดก่อนกดปุ่ม */}
            {bookService && (
              <div className="px-6 py-3 flex justify-between items-center bg-gray-50 border-b border-gray-100">
                <div className="text-xs font-bold text-gray-500">
                  รวมค่าบริการ (฿{baseServicePrice}{' '}
                  {isPickupService ? `+ รับรถ ฿${pickupFee}` : ''})
                </div>
                <div className="flex flex-col items-end">
                  {appliedDiscount && (
                    <div className="text-[10px] text-red-500 font-bold line-through">
                      ฿{baseServicePrice + pickupFee}
                    </div>
                  )}
                  <div className="text-lg font-black text-emerald-600">
                    {isPickupService && distance && distance > 10
                      ? `฿${baseServicePrice} + ?`
                      : `฿${calculateTotal()}`}
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 pt-3">
              <button
                disabled={!isFormComplete() || isBookingProcess}
                onClick={handleBooking}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all flex justify-center items-center px-6 ${
                  isFormComplete() && !isBookingProcess
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-lg'
                    : 'bg-gray-300 cursor-not-allowed'
                }`}
              >
                {isBookingProcess ? 'กำลังบันทึก...' : 'ยืนยันการจองคิว'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'ticket' && ticketData) {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center font-sans">
        <div className="w-full max-w-md bg-white min-h-screen shadow-lg flex flex-col">
          <div className="p-6 bg-emerald-600 text-white text-center flex-shrink-0">
            <div className="w-16 h-16 bg-white text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-3">
              ✓
            </div>
            <h2 className="text-2xl font-bold mb-1">จองคิวสำเร็จ!</h2>
            <p className="text-emerald-100 text-sm font-medium tracking-tight">
              หมายเลขคิว:{' '}
              <span className="text-white font-black text-lg">
                {ticketData.queueNumber}
              </span>
            </p>
          </div>
          <div className="p-6 bg-gray-50 flex-1 space-y-4 text-sm text-gray-700 overflow-y-auto text-left">
            <div className="space-y-2 border-b border-gray-200 pb-4">
              <div className="flex justify-between items-start">
                <span className="text-gray-500">วันที่:</span>
                <strong className="text-emerald-700 text-right">
                  {getFullFormattedDate(ticketData.date)}
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">เวลานำรถเข้า:</span>
                <strong className="text-emerald-700">
                  {ticketData.timeSlot.split(' - ')[0]} น.
                </strong>
              </div>
              <div className="flex justify-between items-start mt-2">
                <span className="text-gray-500">รถของคุณ:</span>
                <strong className="text-right">
                  {ticketData.carModel}{' '}
                  <span className="bg-gray-200 px-1 rounded text-[10px]">
                    Size: {ticketData.carSize}
                  </span>
                  <br />
                  <span className="text-xs font-normal text-gray-500">
                    {ticketData.licensePlate} {ticketData.province}
                  </span>
                </strong>
              </div>
              <div className="flex justify-between items-start pt-2 border-t border-gray-100 mt-2">
                <span className="text-gray-500">จองคิวเมื่อ:</span>
                <strong className="text-gray-600 text-right">
                  {ticketData.bookedAt}
                </strong>
              </div>
            </div>
            <div className="space-y-2 border-b border-gray-200 pb-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  ค่าบริการ ({ticketData.service}):
                </span>
                <strong className="text-gray-800">
                  ฿{ticketData.servicePrice}
                </strong>
              </div>
              {ticketData.isPickup && (
                <div className="flex justify-between items-center text-orange-600">
                  <span>ค่าไปรับรถ ({ticketData.distance} กม.):</span>
                  {Number(ticketData.distance) > 10 ? (
                    <strong>รอเช็กราคา</strong>
                  ) : (
                    <strong>฿{ticketData.pickupFee}</strong>
                  )}
                </div>
              )}
              {/* ✅ แสดงส่วนลดในบิล */}
              {ticketData.discountCode && (
                <div className="flex justify-between items-center text-red-500 bg-red-50 p-2 rounded-lg border border-red-100">
                  <span>ส่วนลด ({ticketData.discountCode}):</span>
                  <strong>-฿{ticketData.discountAmount}</strong>
                </div>
              )}
              <div className="bg-emerald-100 p-3 rounded-xl flex justify-between items-center mt-3 border border-emerald-200">
                <span className="font-bold text-emerald-900">
                  ยอดสุทธิที่ต้องชำระ:
                </span>
                <span className="font-black text-emerald-700 text-2xl">
                  {ticketData.isPickup && Number(ticketData.distance) > 10
                    ? `฿${Math.max(
                        0,
                        ticketData.servicePrice -
                          (ticketData.discountAmount || 0)
                      )} + ?`
                    : `฿${ticketData.totalPrice}`}
                </span>
              </div>
            </div>
            <div className="pt-1">
              <span className="text-gray-500 text-xs block mb-1">
                หมายเหตุและสถานะการรับรถ:
              </span>
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800 italic leading-relaxed">
                "{ticketData.note}"
              </div>
            </div>
          </div>
          <div className="p-6 bg-white border-t border-gray-100 flex-shrink-0">
            <button
              onClick={handleCloseLiff}
              className="w-full py-4 rounded-xl font-bold text-white bg-gray-800 shadow-md text-lg transition-all"
            >
              กลับไปที่หน้าแชท LINE
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default LiffBooking;
