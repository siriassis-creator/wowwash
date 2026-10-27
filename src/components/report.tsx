import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';

const Report: React.FC = () => {
  const [queues, setQueues] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

  const [sizeList, setSizeList] = useState<string[]>([
    'S',
    'M',
    'L',
    'XL',
    'XXL',
    'รถตู้',
  ]);

  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const sizeSnap = await getDocs(query(collection(db, 'settings')));
      sizeSnap.forEach((doc) => {
        if (doc.id === 'carSizes' && doc.data().list)
          setSizeList(doc.data().list);
      });

      const q = query(collection(db, 'queues'), orderBy('createdAt', 'asc'));
      const querySnapshot = await getDocs(q);
      const data: any[] = [];
      querySnapshot.forEach((doc) => {
        const item = doc.data();
        if (item.createdAt) {
          const date = item.createdAt.toDate();
          const monthStr = date.toISOString().slice(0, 7);
          if (monthStr === selectedMonth) {
            data.push({ ...item, jsDate: date });
          }
        }
      });
      setQueues(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedMonth]);

  const getDaysInMonth = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth);
  const todayDate = new Date();
  const todayStr = todayDate.toLocaleDateString('th-TH', {
    day: 'numeric',
    month: 'short',
  });

  const fullMonthlyData: any[] = [];
  for (let i = 1; i <= daysInMonth; i++) {
    const dayData: any = { day: i, totalCars: 0, income: 0 };
    sizeList.forEach((size) => (dayData[size] = 0));
    fullMonthlyData.push(dayData);
  }

  // ✅ เพิ่มตัวแปรแยกประเภทรายได้ของ "วันนี้"
  const incomeByMethodToday: Record<string, number> = {};
  let totalServiceIncomeToday = 0; // รายได้ล้างรถ
  let totalPickupIncomeToday = 0; // รายได้ค่ารับรถ
  let totalDiscountToday = 0; // ✅ ส่วนลดรวมวันนี้

  queues.forEach((q) => {
    const d = q.jsDate.getDate();
    const size = q.carSize || 'S';
    const servicePrice = q.servicePrice || 0;
    const pickupFee = q.pickupFee || 0;
    const discountAmt = q.discountAmount || 0; // ✅ ดึงส่วนลด

    // ยอดรวมต่อบิล (หักส่วนลดแล้ว)
    const totalPrice =
      q.totalPrice || Math.max(0, servicePrice + pickupFee - discountAmt);
    const index = d - 1;

    if (fullMonthlyData[index]) {
      fullMonthlyData[index][size] = (fullMonthlyData[index][size] || 0) + 1;
      fullMonthlyData[index].totalCars += 1;
      if (q.status === 'completed') {
        fullMonthlyData[index].income += totalPrice;

        // กรองข้อมูลเฉพาะของวันนี้
        if (q.jsDate.toDateString() === todayDate.toDateString()) {
          const method = q.paymentMethod || 'อื่นๆ';
          incomeByMethodToday[method] =
            (incomeByMethodToday[method] || 0) + totalPrice;

          totalServiceIncomeToday += servicePrice;
          totalPickupIncomeToday += pickupFee;
          totalDiscountToday += discountAmt; // ✅ เก็บยอดส่วนลดรวม
        }
      }
    }
  });

  const todayQueues = queues.filter(
    (q) => q.jsDate.toDateString() === todayDate.toDateString()
  );
  const waitingToday = todayQueues.filter((q) => q.status === 'waiting').length;
  const completedToday = todayQueues.filter(
    (q) => q.status === 'completed'
  ).length;

  // ✅ รายได้รวมสุทธิ (หักส่วนลดแล้ว)
  const incomeToday =
    totalServiceIncomeToday + totalPickupIncomeToday - totalDiscountToday;

  const packageSummary = queues
    .filter((q) => q.status === 'completed')
    .reduce((acc: any, q) => {
      acc[q.service] = (acc[q.service] || 0) + (q.servicePrice || 0); // นับเฉพาะค่าบริการหลัก
      return acc;
    }, {});
  const rankedPackages = Object.entries(packageSummary)
    .map(([name, value]: [string, any]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const COLORS = [
    '#10b981',
    '#3b82f6',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#64748b',
  ];

  if (isLoading)
    return (
      <div className="p-10 text-center font-bold text-emerald-600 animate-bounce">
        กำลังสรุปข้อมูลรายได้...
      </div>
    );

  return (
    <div className="p-4 sm:p-8 bg-gray-50 min-h-screen font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header - ✅ นำ Financial Dashboard ออก */}
        <div className="flex flex-col sm:flex-row justify-end items-center mb-10 gap-4">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-4 rounded-3xl border-none shadow-lg font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* 🔝 Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* คิววันนี้ */}
          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100 flex flex-col justify-between">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
                Today Status ({todayStr})
              </p>
              <div className="flex items-end gap-2 mb-6">
                <span className="text-6xl font-black text-gray-800">
                  {todayQueues.length}
                </span>
                <span className="text-xl font-bold text-gray-400 mb-2">
                  Cars
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-amber-50 p-4 rounded-3xl">
                <p className="text-[10px] font-bold text-amber-600 uppercase">
                  รอคิว
                </p>
                <p className="text-2xl font-black text-amber-700">
                  {waitingToday}
                </p>
              </div>
              <div className="bg-emerald-50 p-4 rounded-3xl">
                <p className="text-[10px] font-bold text-emerald-600 uppercase">
                  เสร็จแล้ว
                </p>
                <p className="text-2xl font-black text-emerald-700">
                  {completedToday}
                </p>
              </div>
            </div>
          </div>

          {/* ✅ รายได้วันนี้ (แยกประเภทและแสดงส่วนลด) */}
          <div className="bg-emerald-600 p-8 rounded-[3rem] shadow-xl text-white flex flex-col">
            <p className="text-[10px] font-black text-emerald-100 uppercase tracking-[0.2em] mb-1">
              Total Daily Income (Net)
            </p>
            <h3 className="text-6xl font-black mb-6">
              ฿{incomeToday.toLocaleString()}
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-emerald-700/50 p-3 rounded-2xl border border-emerald-500/30">
                <p className="text-[9px] font-bold text-emerald-200 uppercase opacity-80">
                  🚿 ค่าล้างรถ
                </p>
                <p className="text-lg font-black">
                  ฿{totalServiceIncomeToday.toLocaleString()}
                </p>
              </div>
              <div className="bg-emerald-700/50 p-3 rounded-2xl border border-emerald-500/30">
                <p className="text-[9px] font-bold text-emerald-200 uppercase opacity-80">
                  🚚 ค่ารับรถ
                </p>
                <p className="text-lg font-black">
                  ฿{totalPickupIncomeToday.toLocaleString()}
                </p>
              </div>
              <div className="bg-red-500/20 p-3 rounded-2xl border border-red-400/30">
                <p className="text-[9px] font-bold text-red-200 uppercase opacity-80">
                  🎟️ ส่วนลด
                </p>
                <p className="text-lg font-black text-red-200">
                  -฿{totalDiscountToday.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="mt-auto pt-4 border-t border-emerald-500/50">
              <p className="text-[10px] font-black text-emerald-200 uppercase tracking-widest mb-3">
                สรุปตามช่องทางชำระเงิน
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(incomeByMethodToday).map(([method, amount]) => (
                  <div
                    key={method}
                    className="flex items-center gap-2 bg-emerald-800/40 px-4 py-2 rounded-full border border-emerald-500/20"
                  >
                    <span className="text-[10px] font-bold text-emerald-200">
                      {method}:
                    </span>
                    <span className="text-sm font-black">
                      ฿{amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 📊 กราฟ Stacked Bar จำนวนรถ */}
        <div className="bg-white p-6 sm:p-8 rounded-[3rem] shadow-sm border border-gray-100 mb-8 overflow-hidden">
          <h4 className="font-black text-gray-800 mb-8 flex items-center">
            <span className="mr-3 p-2 bg-gray-100 rounded-xl text-lg">🚗</span>
            จำนวนรถรายวัน (แยกตามขนาด)
          </h4>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fullMonthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" />
                {sizeList.map((size, index) => (
                  <Bar
                    key={size}
                    dataKey={size}
                    stackId="a"
                    fill={COLORS[index % COLORS.length]}
                    radius={
                      index === sizeList.length - 1
                        ? [5, 5, 0, 0]
                        : [0, 0, 0, 0]
                    }
                  >
                    {index === sizeList.length - 1 && (
                      <LabelList
                        dataKey="totalCars"
                        position="top"
                        style={{
                          fontWeight: 'black',
                          fill: '#1e293b',
                          fontSize: '10px',
                        }}
                      />
                    )}
                  </Bar>
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 💵 กราฟแท่ง รายได้รายวัน */}
        <div className="bg-white p-6 sm:p-8 rounded-[3rem] shadow-sm border border-gray-100 mb-8">
          <h4 className="font-black text-gray-800 mb-8 flex items-center">
            <span className="mr-3 p-2 bg-gray-100 rounded-xl text-lg">💰</span>
            รายได้รวมสุทธิแต่ละวัน (หักส่วนลดแล้ว)
          </h4>
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={fullMonthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f0f0f0"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 'bold' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip
                  cursor={{ fill: '#f0fdf4' }}
                  contentStyle={{
                    borderRadius: '20px',
                    border: 'none',
                    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="income" fill="#10b981" radius={[10, 10, 0, 0]}>
                  <LabelList
                    dataKey="income"
                    position="top"
                    style={{
                      fontWeight: 'black',
                      fill: '#10b981',
                      fontSize: '10px',
                    }}
                    formatter={(val: any) => (val > 0 ? `฿${val}` : '')}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 🏆 Ranking Package */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-gray-100">
          <h4 className="font-black text-gray-800 mb-8 flex items-center">
            <span className="mr-3 p-2 bg-gray-100 rounded-xl text-lg">🚿</span>
            รายได้แยกตามบริการล้างรถ (เรียงจากมากไปน้อย)
          </h4>
          <div className="space-y-6">
            {rankedPackages.length > 0 ? (
              rankedPackages.map((item, index) => (
                <div key={item.name} className="flex items-center gap-6">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-lg"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-2 items-center">
                      <span className="font-black text-gray-700">
                        {item.name}
                      </span>
                      <span className="font-black text-emerald-600 text-lg">
                        ฿{item.value.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all duration-1000"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                          width: `${
                            (item.value / (rankedPackages[0]?.value || 1)) * 100
                          }%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-400 italic">
                ยังไม่มีข้อมูลรายได้ในเดือนนี้
              </p>
            )}
          </div>
          <p className="mt-6 text-[10px] text-gray-400 italic text-center">
            * ยอดส่วนนี้คำนวณจากค่าบริการล้างรถเต็มจำนวน
            เพื่อให้เห็นความนิยมของบริการ (ไม่หักส่วนลดและไม่รวมค่ารับรถ)
          </p>
        </div>
      </div>
    </div>
  );
};

export default Report;
