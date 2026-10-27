import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// ✅ กำหนดลำดับที่ต้องการ
const sizeOrder = ['S', 'M', 'L', 'XL', 'XXL', 'รถตู้'];

const Price: React.FC = () => {
  const [pricing, setPricing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPricing = async () => {
      const snap = await getDoc(doc(db, 'settings', 'pricing'));
      if (snap.exists()) {
        setPricing(snap.data());
      }
      setLoading(false);
    };
    fetchPricing();
  }, []);

  // ✅ ฟังก์ชันสำหรับปิด LIFF เพื่อกลับเข้าหน้าแชท
  const handleCloseLiff = () => {
    if ((window as any).liff && (window as any).liff.isInClient()) {
      (window as any).liff.closeWindow();
    } else {
      alert('กรุณากลับไปที่หน้าแชท LINE');
    }
  };

  if (loading)
    return <div className="p-10 text-center">กำลังโหลดข้อมูลราคา...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-black text-gray-800 mb-2 text-center uppercase tracking-tighter">
          Package & Pricing
        </h2>
        <p className="text-center text-gray-500 mb-10 text-sm">
          อัตราค่าบริการแยกตามขนาดรถ (S, M, L, XL, XXL, รถตู้)
        </p>

        {pricing?.promotion?.isActive && (
          <div className="mb-10 bg-gradient-to-r from-amber-400 to-orange-500 p-6 rounded-3xl text-white shadow-lg animate-pulse">
            <h3 className="text-xl font-black mb-1 flex items-center">
              🔥 {pricing.promotion.title}
            </h3>
            <p className="text-sm opacity-90">{pricing.promotion.detail}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricing?.services &&
            Object.entries(pricing.services).map(
              ([name, rates]: [string, any]) => (
                <div
                  key={name}
                  className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden flex flex-col transform hover:scale-105 transition-all"
                >
                  <div className="bg-emerald-600 p-6 text-center text-white">
                    <h3 className="font-black text-xl">{name}</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    {Object.entries(rates)
                      .sort(([sizeA], [sizeB]) => {
                        const indexA = sizeOrder.indexOf(sizeA);
                        const indexB = sizeOrder.indexOf(sizeB);
                        return (
                          (indexA > -1 ? indexA : 99) -
                          (indexB > -1 ? indexB : 99)
                        );
                      })
                      .map(([size, price]) => (
                        <div
                          key={size}
                          className="flex justify-between items-center border-b border-gray-50 pb-2"
                        >
                          <span className="font-black text-gray-400">
                            SIZE {size}
                          </span>
                          <span className="text-2xl font-black text-emerald-600">
                            ฿{price as number}
                          </span>
                        </div>
                      ))}
                  </div>
                  <div className="p-6 mt-auto">
                    <div className="text-[10px] text-gray-400 text-center italic">
                      * ราคาอาจมีการเปลี่ยนแปลงตามความเหมาะสมของสภาพรถ
                    </div>
                  </div>
                </div>
              )
            )}
        </div>

        {/* ✅ เพิ่มปุ่มปิดหน้าต่างสำหรับลูกค้าที่เปิดผ่าน LINE */}
        <div className="mt-10 mb-10">
          <button
            onClick={handleCloseLiff}
            className="w-full py-4 rounded-2xl font-bold text-white bg-gray-800 hover:bg-gray-900 shadow-md transition-all text-lg flex items-center justify-center"
          >
            <span className="mr-2">↩️</span> กลับไปที่หน้าแชท LINE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Price;
