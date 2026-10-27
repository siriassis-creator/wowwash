import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'pin' | 'cars' | 'pricing' | 'payments' | 'discounts'
  >('pin');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [pin, setPin] = useState<string>('1234');
  const [carSizes, setCarSizes] = useState<string[]>(['S', 'M', 'L', 'XL']);
  const [newSizeName, setNewSizeName] = useState('');
  const [carData, setCarData] = useState<
    Record<string, { model: string; size: string }[]>
  >({});
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [newBrandName, setNewBrandName] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelSize, setNewModelSize] = useState('');
  const [prices, setPrices] = useState<Record<string, Record<string, number>>>(
    {}
  );
  const [newServiceName, setNewServiceName] = useState('');
  const [promotion, setPromotion] = useState({
    title: '',
    detail: '',
    isActive: false,
  });

  // State สำหรับช่องทางชำระเงิน
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'เงินสด',
    'โอนผ่านธนาคาร',
  ]);
  const [newPaymentName, setNewPaymentName] = useState('');

  // ✅ State สำหรับโค้ดส่วนลด
  const [discountCodes, setDiscountCodes] = useState<
    Array<{ code: string; amount: number; expiry: string; usedCount: number }>
  >([]);
  const [discountForm, setDiscountForm] = useState({
    code: '',
    amount: '',
    expiry: '',
  });
  const [editingDiscountIndex, setEditingDiscountIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const pinSnap = await getDoc(doc(db, 'settings', 'general'));
        if (pinSnap.exists() && pinSnap.data().staffPin)
          setPin(pinSnap.data().staffPin);

        const sizeSnap = await getDoc(doc(db, 'settings', 'carSizes'));
        if (sizeSnap.exists() && sizeSnap.data().list) {
          setCarSizes(sizeSnap.data().list);
          setNewModelSize(sizeSnap.data().list[0] || 'S');
        }

        const carsSnap = await getDoc(doc(db, 'settings', 'carModels'));
        if (carsSnap.exists() && carsSnap.data().brands) {
          setCarData(carsSnap.data().brands);
          setSelectedBrand(Object.keys(carsSnap.data().brands)[0] || '');
        }

        const priceSnap = await getDoc(doc(db, 'settings', 'pricing'));
        if (priceSnap.exists()) {
          if (priceSnap.data().services) setPrices(priceSnap.data().services);
          if (priceSnap.data().promotion)
            setPromotion(priceSnap.data().promotion);
        }

        const paySnap = await getDoc(doc(db, 'settings', 'payments'));
        if (paySnap.exists() && paySnap.data().list)
          setPaymentMethods(paySnap.data().list);

        // ✅ ดึงข้อมูลโค้ดส่วนลด
        const discountSnap = await getDoc(doc(db, 'settings', 'discounts'));
        if (discountSnap.exists() && discountSnap.data().list) {
          setDiscountCodes(discountSnap.data().list);
        }
      } catch (error) {
        console.error('Fetch Error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleAddSize = () => {
    const name = newSizeName.trim().toUpperCase();
    if (!name || carSizes.includes(name)) return;
    setCarSizes((prev) => [...prev, name]);
    setNewSizeName('');
  };

  const handleDeleteSize = (name: string) => {
    if (window.confirm(`ลบขนาดรถ "${name}"?`))
      setCarSizes((prev) => prev.filter((s) => s !== name));
  };

  const handleAddService = () => {
    const serviceName = newServiceName.trim();
    if (!serviceName || prices[serviceName]) return;
    const initialRates: Record<string, number> = {};
    carSizes.forEach((s) => (initialRates[s] = 0));
    setPrices((prev) => ({ ...prev, [serviceName]: initialRates }));
    setNewServiceName('');
  };

  const handleDeleteService = (serviceName: string) => {
    if (window.confirm(`ลบบริการ "${serviceName}"?`)) {
      setPrices((prev) => {
        const newState = { ...prev };
        delete newState[serviceName];
        return newState;
      });
    }
  };

  const handleAddPayment = () => {
    const name = newPaymentName.trim();
    if (!name || paymentMethods.includes(name)) return;
    setPaymentMethods((prev) => [...prev, name]);
    setNewPaymentName('');
  };

  // ✅ ฟังก์ชันจัดการโค้ดส่วนลด
  const handleSaveDiscount = () => {
    if (!discountForm.code || !discountForm.amount || !discountForm.expiry) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }
    const codeName = discountForm.code.trim().toUpperCase();

    // เช็กโค้ดซ้ำ (กรณีสร้างใหม่)
    if (
      editingDiscountIndex === null &&
      discountCodes.some((c) => c.code === codeName)
    ) {
      alert('โค้ดส่วนลดนี้มีอยู่แล้วในระบบ');
      return;
    }

    const newDiscount = {
      code: codeName,
      amount: Number(discountForm.amount),
      expiry: discountForm.expiry,
      usedCount:
        editingDiscountIndex !== null
          ? discountCodes[editingDiscountIndex].usedCount
          : 0,
    };

    if (editingDiscountIndex !== null) {
      const updated = [...discountCodes];
      updated[editingDiscountIndex] = newDiscount;
      setDiscountCodes(updated);
      setEditingDiscountIndex(null);
    } else {
      setDiscountCodes([...discountCodes, newDiscount]);
    }
    setDiscountForm({ code: '', amount: '', expiry: '' });
  };

  const handleEditDiscount = (index: number) => {
    setDiscountForm({
      code: discountCodes[index].code,
      amount: discountCodes[index].amount.toString(),
      expiry: discountCodes[index].expiry,
    });
    setEditingDiscountIndex(index);
  };

  const handleDeleteDiscount = (index: number) => {
    if (window.confirm('ยืนยันการลบโค้ดส่วนลดนี้ออกจากระบบ?')) {
      setDiscountCodes(discountCodes.filter((_, i) => i !== index));
    }
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, 'settings', 'general'),
        { staffPin: pin },
        { merge: true }
      );
      await setDoc(doc(db, 'settings', 'carSizes'), { list: carSizes });
      await setDoc(doc(db, 'settings', 'carModels'), { brands: carData });
      await setDoc(doc(db, 'settings', 'pricing'), {
        services: prices,
        promotion,
      });
      await setDoc(doc(db, 'settings', 'payments'), { list: paymentMethods });
      // ✅ บันทึกโค้ดส่วนลด
      await setDoc(doc(db, 'settings', 'discounts'), { list: discountCodes });

      alert('✅ บันทึกข้อมูลทั้งหมดเรียบร้อยแล้ว!');
    } catch (error) {
      alert('❌ บันทึกไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <div className="p-10 text-center text-emerald-600 font-bold animate-pulse">
        กำลังโหลด...
      </div>
    );

  return (
    <div className="p-4 sm:p-6 w-full h-full flex flex-col font-sans bg-gray-50">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
          ตั้งค่าระบบ
        </h2>
        <button
          onClick={handleSaveAll}
          disabled={isSaving}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg active:scale-95 transition-all text-sm"
        >
          {isSaving ? '⏳ กำลังเซฟ...' : '💾 บันทึกทั้งหมด'}
        </button>
      </div>

      {/* Tab Menu */}
      <div className="flex space-x-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setActiveTab('pin')}
          className={`px-5 py-2.5 rounded-2xl font-bold transition-all whitespace-nowrap text-xs ${
            activeTab === 'pin'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-500 border border-gray-100'
          }`}
        >
          🔐 PIN
        </button>
        <button
          onClick={() => setActiveTab('cars')}
          className={`px-5 py-2.5 rounded-2xl font-bold transition-all whitespace-nowrap text-xs ${
            activeTab === 'cars'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-500 border border-gray-100'
          }`}
        >
          🚗 รถ & ขนาด
        </button>
        <button
          onClick={() => setActiveTab('pricing')}
          className={`px-5 py-2.5 rounded-2xl font-bold transition-all whitespace-nowrap text-xs ${
            activeTab === 'pricing'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-500 border border-gray-100'
          }`}
        >
          💰 บริการ & ราคา
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-5 py-2.5 rounded-2xl font-bold transition-all whitespace-nowrap text-xs ${
            activeTab === 'payments'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-500 border border-gray-100'
          }`}
        >
          💳 การชำระเงิน
        </button>
        <button
          onClick={() => setActiveTab('discounts')}
          className={`px-5 py-2.5 rounded-2xl font-bold transition-all whitespace-nowrap text-xs ${
            activeTab === 'discounts'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white text-gray-500 border border-gray-100'
          }`}
        >
          🎟️ โค้ดส่วนลด
        </button>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
        {activeTab === 'pin' && (
          <div className="p-10 flex flex-col items-center animate-fade-in">
            <h3 className="font-bold text-gray-800 mb-6 text-sm">
              รหัส PIN พนักงาน
            </h3>
            <input
              type="text"
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))
              }
              className="text-center text-5xl font-black tracking-[0.3em] text-emerald-600 bg-transparent outline-none mb-6 w-full"
            />
            <button
              onClick={() =>
                setPin(Math.floor(1000 + Math.random() * 9000).toString())
              }
              className="text-gray-400 text-xs font-bold hover:text-emerald-600"
            >
              🔄 สุ่มรหัส
            </button>
          </div>
        )}

        {activeTab === 'cars' && (
          <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 overflow-y-auto">
            <div className="mb-8 bg-gray-50 p-5 rounded-[2rem] border border-gray-100">
              <h4 className="font-black text-gray-800 mb-4 text-sm uppercase">
                📏 1. จัดการขนาดรถ
              </h4>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newSizeName}
                  onChange={(e) => setNewSizeName(e.target.value)}
                  placeholder="เช่น VIP, BIGBIKE..."
                  className="flex-1 p-3 rounded-xl border-none bg-white text-sm outline-none shadow-sm"
                />
                <button
                  onClick={handleAddSize}
                  className="bg-gray-800 text-white px-6 rounded-xl font-bold text-xs"
                >
                  เพิ่ม
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {carSizes.map((s) => (
                  <div
                    key={s}
                    className="bg-white border border-emerald-100 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center shadow-sm"
                  >
                    <span className="text-emerald-600 mr-2">{s}</span>
                    <button
                      onClick={() => handleDeleteSize(s)}
                      className="text-red-300 hover:text-red-500 font-bold text-lg"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="col-span-1 space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase">
                    2. แบรนด์รถ
                  </label>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto pr-2 scrollbar-hide">
                    {Object.keys(carData).map((brand) => (
                      <div key={brand} className="flex gap-2 group">
                        <button
                          onClick={() => setSelectedBrand(brand)}
                          className={`flex-1 text-left px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                            selectedBrand === brand
                              ? 'bg-emerald-600 text-white'
                              : 'bg-gray-50 text-gray-500'
                          }`}
                        >
                          {brand}
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('ลบแบรนด์?')) {
                              const n = { ...carData };
                              delete n[brand];
                              setCarData(n);
                            }
                          }}
                          className="text-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <input
                  type="text"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="ยี่ห้อใหม่..."
                  className="w-full p-3 rounded-xl bg-white shadow-sm text-sm border-none"
                />
                <button
                  onClick={() => {
                    if (newBrandName) {
                      setCarData({ ...carData, [newBrandName.trim()]: [] });
                      setNewBrandName('');
                      setSelectedBrand(newBrandName.trim());
                    }
                  }}
                  className="w-full bg-gray-800 text-white py-3 rounded-xl font-bold text-xs"
                >
                  ➕ เพิ่ม
                </button>
              </div>
              <div className="col-span-1 md:col-span-2">
                {selectedBrand ? (
                  <div className="bg-white p-5 border border-gray-100 rounded-[2rem] h-full shadow-sm">
                    <h4 className="font-black text-gray-800 mb-4 text-sm">
                      แบรนด์: {selectedBrand}
                    </h4>
                    <div className="flex gap-2 mb-6">
                      <input
                        type="text"
                        value={newModelName}
                        onChange={(e) => setNewModelName(e.target.value)}
                        placeholder="ชื่อรุ่น..."
                        className="flex-1 p-3 bg-gray-50 rounded-xl text-sm border-none"
                      />
                      <select
                        value={newModelSize}
                        onChange={(e) => setNewModelSize(e.target.value)}
                        className="p-3 bg-gray-50 rounded-xl text-sm font-bold border-none"
                      >
                        {carSizes.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => {
                          if (newModelName) {
                            setCarData({
                              ...carData,
                              [selectedBrand]: [
                                ...carData[selectedBrand],
                                {
                                  model: newModelName.trim(),
                                  size: newModelSize,
                                },
                              ],
                            });
                            setNewModelName('');
                          }
                        }}
                        className="bg-emerald-600 text-white px-5 py-3 rounded-xl font-bold text-xs"
                      >
                        เพิ่ม
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {carData[selectedBrand]?.map((m, idx) => (
                        <div
                          key={idx}
                          className="bg-gray-50 border border-gray-100 px-3 py-1.5 rounded-xl text-xs flex items-center shadow-sm"
                        >
                          <span className="font-black text-emerald-600 bg-white px-1.5 py-0.5 rounded mr-2 text-[9px] uppercase">
                            {m.size}
                          </span>
                          <span className="font-bold">{m.model}</span>
                          <button
                            onClick={() => {
                              const updated = [...carData[selectedBrand]];
                              updated.splice(idx, 1);
                              setCarData({
                                ...carData,
                                [selectedBrand]: updated,
                              });
                            }}
                            className="ml-2 text-red-400 font-bold"
                          >
                            &times;
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-300 font-bold text-sm">
                    กรุณาเลือกแบรนด์รถ
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="flex flex-col h-full animate-fade-in p-4 sm:p-6 overflow-y-auto">
            <div className="bg-emerald-50/50 p-5 rounded-[2rem] border border-emerald-100 mb-8">
              <h4 className="font-black text-emerald-800 mb-3 ml-1 uppercase text-[10px]">
                ➕ เพิ่มบริการใหม่
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="เช่น ล้างอัดฉีด..."
                  className="flex-1 p-3 border-none bg-white rounded-xl text-sm outline-none shadow-sm"
                />
                <button
                  onClick={handleAddService}
                  className="bg-emerald-600 text-white px-6 rounded-xl font-bold text-xs"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {Object.entries(prices).map(([serviceName, rates]) => (
                <div
                  key={serviceName}
                  className="bg-white border border-gray-100 rounded-[2rem] p-5 shadow-sm relative"
                >
                  <button
                    onClick={() => handleDeleteService(serviceName)}
                    className="absolute top-4 right-4 text-red-500 font-bold text-sm"
                  >
                    🗑️
                  </button>
                  <h4 className="font-black text-gray-800 mb-5 border-b border-gray-50 pb-3 text-sm">
                    {serviceName}
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {carSizes.map((size) => (
                      <div
                        key={size}
                        className="bg-gray-50 p-3 rounded-2xl border border-gray-100"
                      >
                        <span className="font-black text-gray-400 text-[9px] block mb-1 uppercase">
                          SIZE: {size}
                        </span>
                        <div className="flex items-center">
                          <span className="text-gray-400 text-xs mr-1">฿</span>
                          <input
                            type="number"
                            value={rates[size] || 0}
                            onChange={(e) =>
                              setPrices({
                                ...prices,
                                [serviceName]: {
                                  ...rates,
                                  [size]: Number(e.target.value),
                                },
                              })
                            }
                            className="w-full bg-transparent font-black text-emerald-600 outline-none text-base"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 bg-amber-50 border border-amber-100 rounded-[2.5rem] p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-black text-amber-800 text-sm">
                  🎁 โปรโมชัน
                </h4>
                <input
                  type="checkbox"
                  checked={promotion.isActive}
                  onChange={(e) =>
                    setPromotion({ ...promotion, isActive: e.target.checked })
                  }
                  className="w-5 h-5 accent-amber-500"
                />
              </div>
              <input
                type="text"
                value={promotion.title}
                onChange={(e) =>
                  setPromotion({ ...promotion, title: e.target.value })
                }
                placeholder="หัวข้อโปรโมชัน..."
                className="w-full p-3.5 bg-white rounded-xl border-none mb-3 outline-none font-bold text-sm"
              />
              <textarea
                value={promotion.detail}
                onChange={(e) =>
                  setPromotion({ ...promotion, detail: e.target.value })
                }
                placeholder="รายละเอียด..."
                rows={2}
                className="w-full p-3.5 bg-white rounded-xl border-none outline-none text-xs"
              />
            </div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div className="p-6 flex flex-col h-full animate-fade-in overflow-y-auto">
            <h4 className="font-black text-gray-800 mb-6 text-sm uppercase">
              💳 จัดการช่องทางชำระเงิน
            </h4>
            <div className="bg-emerald-50/50 p-6 rounded-[2rem] border border-emerald-100 mb-6">
              <label className="block text-xs font-bold text-emerald-800 mb-3">
                ➕ เพิ่มช่องทางใหม่ (เช่น กสิกร, แสกนจ่าย, เงินสด)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPaymentName}
                  onChange={(e) => setNewPaymentName(e.target.value)}
                  placeholder="ระบุช่องทาง..."
                  className="flex-1 p-3 border-none bg-white rounded-xl text-sm outline-none shadow-sm"
                />
                <button
                  onClick={handleAddPayment}
                  className="bg-emerald-600 text-white px-6 rounded-xl font-bold text-xs"
                >
                  เพิ่ม
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              {paymentMethods.map((method, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-100 px-5 py-3 rounded-2xl shadow-sm flex items-center gap-3"
                >
                  <span className="font-black text-gray-700 text-sm">
                    {method}
                  </span>
                  <button
                    onClick={() =>
                      setPaymentMethods(
                        paymentMethods.filter((_, i) => i !== index)
                      )
                    }
                    className="text-red-400 hover:text-red-600 font-bold text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[10px] text-gray-400 italic font-bold">
              * ช่องทางเหล่านี้จะไปปรากฏให้พนักงานเลือกตอนกดบันทึกการชำระเงิน
            </p>
          </div>
        )}

        {/* ✅ แท็บใหม่: จัดการโค้ดส่วนลด */}
        {activeTab === 'discounts' && (
          <div className="p-4 sm:p-6 flex flex-col h-full animate-fade-in overflow-y-auto">
            <h4 className="font-black text-gray-800 mb-6 text-sm uppercase">
              🎟️ จัดการโค้ดส่วนลด
            </h4>

            <div className="bg-emerald-50/50 p-5 sm:p-6 rounded-[2.5rem] border border-emerald-100 mb-6">
              <label className="block text-xs font-bold text-emerald-800 mb-3">
                {editingDiscountIndex !== null
                  ? '📝 แก้ไขโค้ดส่วนลด'
                  : '➕ สร้างโค้ดส่วนลดใหม่'}
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input
                  type="text"
                  value={discountForm.code}
                  onChange={(e) =>
                    setDiscountForm({
                      ...discountForm,
                      code: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="CODE (เช่น SAVE50)"
                  className="p-3 border-none bg-white rounded-xl text-sm outline-none shadow-sm uppercase font-bold text-gray-800"
                />
                <div className="relative">
                  <span className="absolute left-3 top-3 text-gray-400 text-sm font-bold">
                    ฿
                  </span>
                  <input
                    type="number"
                    value={discountForm.amount}
                    onChange={(e) =>
                      setDiscountForm({
                        ...discountForm,
                        amount: e.target.value,
                      })
                    }
                    placeholder="ส่วนลด (บาท)"
                    className="w-full p-3 pl-8 border-none bg-white rounded-xl text-sm outline-none shadow-sm font-bold text-emerald-600"
                  />
                </div>
                <input
                  type="date"
                  value={discountForm.expiry}
                  onChange={(e) =>
                    setDiscountForm({ ...discountForm, expiry: e.target.value })
                  }
                  className="p-3 border-none bg-white rounded-xl text-sm outline-none shadow-sm font-bold text-gray-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveDiscount}
                    className="flex-1 bg-emerald-600 text-white px-4 py-3 rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all"
                  >
                    {editingDiscountIndex !== null ? 'บันทึก' : 'เพิ่มโค้ด'}
                  </button>
                  {editingDiscountIndex !== null && (
                    <button
                      onClick={() => {
                        setEditingDiscountIndex(null);
                        setDiscountForm({ code: '', amount: '', expiry: '' });
                      }}
                      className="flex-1 bg-gray-300 text-gray-700 px-4 py-3 rounded-xl font-bold text-xs hover:bg-gray-400 transition-all"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {discountCodes.map((discount, index) => {
                // เช็กว่าหมดอายุแล้วหรือยัง (เทียบกับเที่ยงคืนของวันนี้)
                const isExpired =
                  new Date(discount.expiry) <
                  new Date(new Date().setHours(0, 0, 0, 0));

                return (
                  <div
                    key={index}
                    className={`bg-white border px-5 py-4 rounded-3xl shadow-sm flex flex-col gap-3 transition-all ${
                      isExpired
                        ? 'border-red-100 opacity-60'
                        : 'border-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span
                          className={`font-black text-lg tracking-wider border-b-2 pb-1 inline-block mb-2 ${
                            isExpired
                              ? 'text-red-400 border-red-100'
                              : 'text-emerald-600 border-emerald-100'
                          }`}
                        >
                          {discount.code}
                        </span>
                        <div className="text-xs font-bold text-gray-500">
                          ส่วนลด:{' '}
                          <span className="text-emerald-500">
                            ฿{discount.amount}
                          </span>
                          <span className="mx-2 text-gray-300">|</span>
                          หมดอายุ:{' '}
                          <span
                            className={
                              isExpired ? 'text-red-500' : 'text-gray-700'
                            }
                          >
                            {discount.expiry.split('-').reverse().join('/')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditDiscount(index)}
                          className="text-gray-400 hover:text-emerald-500 font-bold text-sm bg-gray-50 p-2 rounded-lg"
                        >
                          📝
                        </button>
                        <button
                          onClick={() => handleDeleteDiscount(index)}
                          className="text-red-300 hover:text-red-500 font-bold text-sm bg-gray-50 p-2 rounded-lg"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <div className="bg-gray-50 p-2.5 rounded-xl flex justify-between items-center border border-gray-100">
                      <span className="text-[10px] font-bold text-gray-400">
                        📊 จำนวนที่ถูกใช้งานไปแล้ว:
                      </span>
                      <span className="text-sm font-black text-gray-700 bg-white px-2 py-1 rounded shadow-sm">
                        {discount.usedCount}{' '}
                        <span className="text-[9px] font-normal text-gray-400">
                          ครั้ง
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })}
              {discountCodes.length === 0 && (
                <div className="col-span-full text-center py-10 text-gray-400 text-sm font-bold italic">
                  ยังไม่มีโค้ดส่วนลดในระบบ
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
