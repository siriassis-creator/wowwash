import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import {
  collection,
  getDocs,
  query,
  deleteDoc,
  doc,
  setDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
} from 'firebase/firestore';

// --- ข้อมูลพื้นฐานสำหรับ Dropdown ---
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

const carBrandsAndModels: Record<string, string[]> = {
  Toyota: [
    'Yaris',
    'Yaris Ativ',
    'Vios',
    'Corolla Altis',
    'Camry',
    'Hilux Revo',
    'Fortuner',
    'Corolla Cross',
    'C-HR',
    'Veloz',
    'Alphard',
    'อื่นๆ',
  ],
  Honda: [
    'City',
    'Civic',
    'Accord',
    'HR-V',
    'CR-V',
    'BR-V',
    'WR-V',
    'Brio',
    'Mobilio',
    'อื่นๆ',
  ],
  Isuzu: ['D-Max', 'MU-X', 'อื่นๆ'],
  Mazda: [
    'D-Max (BT-50)',
    'Mazda 2',
    'Mazda 3',
    'CX-3',
    'CX-30',
    'CX-5',
    'CX-8',
    'อื่นๆ',
  ],
  Nissan: ['Almera', 'Sylphy', 'Teana', 'Navara', 'Kicks', 'Terra', 'อื่นๆ'],
  Mitsubishi: [
    'Almera (Attrage)',
    'Mirage',
    'Triton',
    'Pajero Sport',
    'Xpander',
    'อื่นๆ',
  ],
  Ford: ['Ranger', 'Everest', 'Mustang', 'อื่นๆ'],
  MG: ['MG3', 'MG5', 'HS', 'ZS', 'อื่นๆ'],
  Suzuki: ['Swift', 'Celerio', 'Ciaz', 'Ertiga', 'อื่นๆ'],
  'GWM / Haval': ['Jolion', 'H6', 'Good Cat', 'อื่นๆ'],
  BYD: ['Dolphin', 'Atto 3', 'Seal', 'อื่นๆ'],
  BMW: [
    'Series 2',
    'Series 3',
    'Series 4',
    'Series 5',
    'Series 7',
    'X1',
    'X3',
    'X4',
    'X5',
    'อื่นๆ',
  ],
  'Mercedes-Benz': [
    'A-Class',
    'C-Class',
    'E-Class',
    'S-Class',
    'GLA',
    'GLC',
    'GLE',
    'อื่นๆ',
  ],
  Tesla: ['Model 3', 'Model Y', 'อื่นๆ'],
  อื่นๆ: ['ระบุรุ่นรถด้วยตนเอง'],
};

interface CarData {
  carModel: string;
  licensePlate: string;
  province: string;
}

interface Citizen {
  id: string;
  fullName: string;
  phone: string;
  cars: CarData[];
  carModel?: string;
  licensePlate?: string;
  province?: string;
  lineDisplayName: string;
  linePictureUrl: string;
}

// โครงสร้างฟอร์มสำหรับรถหลายคัน
interface DraftCar {
  brand: string;
  model: string;
  customModel: string;
  color: string;
  plate: string;
  province: string;
}

const initialDraftCar: DraftCar = {
  brand: 'Toyota',
  model: 'Yaris',
  customModel: '',
  color: 'ขาว',
  plate: '',
  province: 'กรุงเทพมหานคร',
};

const Members: React.FC = () => {
  const [citizens, setCitizens] = useState<Citizen[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddCarModal, setShowAddCarModal] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedUserName, setSelectedUserName] = useState('');

  // ฟอร์มข้อมูลลูกค้า
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');

  // ✅ State แบบ Array สำหรับเก็บแบบฟอร์มรถหลายๆ คันในหน้าลงทะเบียน
  const [draftCars, setDraftCars] = useState<DraftCar[]>([initialDraftCar]);

  const fetchCitizens = async () => {
    setIsLoading(true);
    try {
      const q = query(collection(db, 'users'));
      const querySnapshot = await getDocs(q);
      const usersData: Citizen[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.role !== 'admin') {
          usersData.push({
            id: docSnap.id,
            fullName: data.fullName || 'ไม่ระบุชื่อ',
            phone: data.phone || '-',
            cars: Array.isArray(data.cars) ? data.cars : [],
            carModel: data.carModel || '-',
            licensePlate: data.licensePlate || '-',
            province: data.province || '-',
            lineDisplayName: data.lineDisplayName || '',
            linePictureUrl: data.pictureUrl || '',
          });
        }
      });
      setCitizens(usersData);
    } catch (error) {
      console.error('Error fetching citizens:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizens();
  }, []);

  const handleDeleteCitizen = async (id: string, name: string) => {
    if (window.confirm(`คุณต้องการลบข้อมูลสมาชิกของ "${name}" ใช่หรือไม่?`)) {
      try {
        await deleteDoc(doc(db, 'users', id));
        setCitizens((prev) => prev.filter((c) => c.id !== id));
      } catch (error) {
        alert('ไม่สามารถลบข้อมูลได้ เกิดข้อผิดพลาด');
      }
    }
  };

  // ✅ ฟังก์ชันอัปเดตข้อมูลรถแต่ละคันในฟอร์ม
  const handleUpdateDraftCar = (
    index: number,
    field: keyof DraftCar,
    value: string
  ) => {
    const updated = [...draftCars];
    updated[index] = { ...updated[index], [field]: value };

    // ถ้ายี่ห้อเปลี่ยน ให้รีเซ็ตรุ่นรถเป็นอันแรกของยี่ห้อนั้น
    if (field === 'brand') {
      updated[index].model = carBrandsAndModels[value]
        ? carBrandsAndModels[value][0]
        : '';
    }
    setDraftCars(updated);
  };

  // ✅ ฟังก์ชันเพิ่ม/ลบ กล่องฟอร์มรถ
  const addDraftCar = () =>
    setDraftCars([...draftCars, { ...initialDraftCar }]);
  const removeDraftCar = (index: number) =>
    setDraftCars(draftCars.filter((_, i) => i !== index));

  // ฟังก์ชันแปลงข้อมูลฟอร์มรถให้พร้อมบันทึกลงฐานข้อมูล
  const prepareCarsForSave = (carsList: DraftCar[]): CarData[] => {
    return carsList.map((c) => {
      let finalModel = `${c.brand} ${c.model}`;
      if (
        c.brand === 'อื่นๆ' ||
        c.model.includes('อื่นๆ') ||
        c.model.includes('ระบุรุ่นรถ')
      ) {
        finalModel = c.customModel.trim() !== '' ? c.customModel : finalModel;
      }
      return {
        carModel: `${finalModel} สี${c.color}`,
        licensePlate: c.plate,
        province: c.province,
      };
    });
  };

  // 1. บันทึกลูกค้าใหม่พร้อมรถทุกคันที่กรอก
  const handleAddCitizen = async (e: React.FormEvent) => {
    e.preventDefault();

    // ตรวจสอบว่ากรอกทะเบียนครบทุกคันไหม
    if (draftCars.some((c) => !c.plate.trim())) {
      alert('กรุณากรอกทะเบียนรถให้ครบทุกคัน');
      return;
    }

    setIsAdding(true);
    try {
      const carsToSave = prepareCarsForSave(draftCars);
      const newUserRef = doc(collection(db, 'users'));

      await setDoc(newUserRef, {
        uid: newUserRef.id,
        lineUserId: '',
        lineDisplayName: 'เพิ่มโดยแอดมิน',
        pictureUrl: '',
        fullName: regFullName,
        phone: regPhone,
        cars: carsToSave, // บันทึกกี่คันก็ได้ตามที่กรอกมา!
        role: 'citizen',
        status: 'active',
        createdAt: serverTimestamp(),
      });

      alert('เพิ่มลูกค้าใหม่และรถยนต์สำเร็จ!');
      setShowAddModal(false);
      setRegFullName('');
      setRegPhone('');
      setDraftCars([{ ...initialDraftCar }]); // ล้างฟอร์มรถ
      fetchCitizens();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsAdding(false);
    }
  };

  // 2. เพิ่มรถคันใหม่ให้ลูกค้าเดิม (กดจากปุ่มในตาราง)
  const handleAddCarToExistingUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftCars[0].plate.trim()) {
      alert('กรุณากรอกทะเบียนรถ');
      return;
    }

    setIsAdding(true);
    try {
      const carsToSave = prepareCarsForSave(draftCars);

      await updateDoc(doc(db, 'users', selectedUserId), {
        cars: arrayUnion(...carsToSave),
      });

      alert(`เพิ่มรถให้คุณ ${selectedUserName} สำเร็จ!`);
      setShowAddCarModal(false);
      setDraftCars([{ ...initialDraftCar }]);
      fetchCitizens();
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเพิ่มรถ');
    } finally {
      setIsAdding(false);
    }
  };

  const filteredCitizens = citizens.filter((c) => {
    const search = searchQuery.toLowerCase();
    const matchBasic =
      c.fullName.toLowerCase().includes(search) ||
      c.phone.includes(search) ||
      c.lineDisplayName.toLowerCase().includes(search);
    const matchCars = c.cars.some(
      (car) =>
        car.carModel.toLowerCase().includes(search) ||
        car.licensePlate.includes(search)
    );
    const matchOldCar =
      c.carModel?.toLowerCase().includes(search) ||
      c.licensePlate?.includes(search);
    return matchBasic || matchCars || matchOldCar;
  });

  return (
    <div className="p-6 w-full h-full flex flex-col relative">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-gray-800">ฐานข้อมูลลูกค้า</h2>
        <div className="flex space-x-3">
          <button
            onClick={() => {
              setDraftCars([{ ...initialDraftCar }]);
              setRegFullName('');
              setRegPhone('');
              setShowAddModal(true);
            }}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition-all flex items-center"
          >
            <span className="mr-2">➕</span> เพิ่มลูกค้าใหม่
          </button>
          <button
            onClick={fetchCitizens}
            className="bg-white border border-gray-300 px-4 py-2 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-all flex items-center"
          >
            <span className="mr-2">🔄</span> รีเฟรช
          </button>
        </div>
      </div>

      <div className="flex-1 w-full bg-white flex flex-col rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* แถบค้นหา */}
        <div className="px-6 py-5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          <input
            type="text"
            placeholder="🔍 ค้นหาชื่อสมาชิก, ทะเบียนรถ, รุ่นรถ หรือ เบอร์โทร..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-md pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none shadow-sm font-medium text-sm"
          />
        </div>

        {/* ตารางข้อมูลลูกค้า */}
        <div className="flex-1 overflow-auto w-full relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-70 z-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          )}

          <table className="w-full text-left border-collapse">
            <thead className="bg-white border-b border-gray-200 sticky top-0 z-0 shadow-sm">
              <tr className="text-gray-500 text-xs uppercase tracking-wider font-black">
                <th className="py-4 px-6 whitespace-nowrap">โปรไฟล์ LINE</th>
                <th className="py-4 px-6 whitespace-nowrap">ชื่อลูกค้า</th>
                <th className="py-4 px-6 whitespace-nowrap">
                  ข้อมูลรถ (คันทั้งหมด)
                </th>
                <th className="py-4 px-6 whitespace-nowrap">เบอร์โทรศัพท์</th>
                <th className="py-4 px-6 text-right whitespace-nowrap">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!isLoading && filteredCitizens.length > 0
                ? filteredCitizens.map((citizen) => (
                    <tr
                      key={citizen.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-6 align-top">
                        <div className="flex items-center space-x-3">
                          {citizen.linePictureUrl ? (
                            <img
                              src={citizen.linePictureUrl}
                              referrerPolicy="no-referrer"
                              alt="LINE"
                              className="w-10 h-10 rounded-full border border-gray-200 shadow-sm object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm shadow-sm">
                              {citizen.fullName.charAt(0)}
                            </div>
                          )}
                          <span className="text-sm font-bold text-gray-800 whitespace-nowrap">
                            {citizen.lineDisplayName || 'ไม่มี (Walk-in)'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 font-bold text-gray-800 whitespace-nowrap align-top">
                        {citizen.fullName}
                      </td>

                      <td className="py-4 px-6 font-medium text-gray-600 align-top">
                        {citizen.cars && citizen.cars.length > 0 ? (
                          <div className="space-y-3">
                            {citizen.cars.map((car, idx) => (
                              <div
                                key={idx}
                                className="flex flex-col border-l-2 border-emerald-400 pl-3"
                              >
                                <span className="font-bold text-gray-800">
                                  {car.carModel}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {car.licensePlate}{' '}
                                  {car.province !== '-' && car.province}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col border-l-2 border-gray-300 pl-3">
                            <span className="font-bold text-gray-800">
                              {citizen.carModel}
                            </span>
                            <span className="text-xs text-gray-500">
                              {citizen.licensePlate}{' '}
                              {citizen.province !== '-' && citizen.province}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-6 font-medium text-gray-600 whitespace-nowrap align-top">
                        {citizen.phone}
                      </td>

                      <td className="py-4 px-6 text-right align-top">
                        <div className="flex flex-col items-end space-y-2">
                          <button
                            onClick={() => {
                              setSelectedUserId(citizen.id);
                              setSelectedUserName(citizen.fullName);
                              setDraftCars([{ ...initialDraftCar }]);
                              setShowAddCarModal(true);
                            }}
                            className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                          >
                            ➕ เพิ่มรถ
                          </button>
                          <button
                            onClick={() =>
                              handleDeleteCitizen(citizen.id, citizen.fullName)
                            }
                            className="text-red-400 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap"
                          >
                            🗑️ ลบข้อมูล
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                : !isLoading && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-16 px-6 text-center text-gray-400 font-bold text-lg"
                      >
                        ไม่พบข้อมูลสมาชิกลูกค้า
                      </td>
                    </tr>
                  )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* --- MODAL: 1. เพิ่มลูกค้าใหม่ (Walk-in) มีปุ่มเพิ่มรถหลายคัน --- */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white">
              <h3 className="font-bold text-xl">
                ➕ ลงทะเบียนลูกค้าใหม่ (Walk-in)
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-emerald-100 hover:text-white font-black text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <form
                id="add-citizen-form"
                onSubmit={handleAddCitizen}
                className="space-y-4"
              >
                {/* ข้อมูลลูกค้า */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ชื่อ - นามสกุล *
                    </label>
                    <input
                      required
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                      placeholder="ชื่อลูกค้า"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      เบอร์โทรศัพท์ *
                    </label>
                    <input
                      required
                      type="tel"
                      maxLength={10}
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-emerald-600"
                      placeholder="08XXXXXXXX"
                    />
                  </div>
                </div>

                {/* ✅ วนลูปกล่องข้อมูลรถ */}
                {draftCars.map((car, index) => (
                  <div
                    key={index}
                    className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3 relative"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-emerald-700">
                        🚗 ข้อมูลรถคันที่ {index + 1}
                      </h3>
                      {draftCars.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftCar(index)}
                          className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg hover:bg-red-100"
                        >
                          ❌ ลบรถคันนี้
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          ยี่ห้อรถ *
                        </label>
                        <select
                          value={car.brand}
                          onChange={(e) =>
                            handleUpdateDraftCar(index, 'brand', e.target.value)
                          }
                          className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                        >
                          {Object.keys(carBrandsAndModels).map((brand) => (
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
                          value={car.model}
                          onChange={(e) =>
                            handleUpdateDraftCar(index, 'model', e.target.value)
                          }
                          className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                        >
                          {carBrandsAndModels[car.brand]?.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {(car.brand === 'อื่นๆ' ||
                      car.model.includes('อื่นๆ') ||
                      car.model.includes('ระบุรุ่นรถ')) && (
                      <div className="animate-fade-in">
                        <input
                          type="text"
                          required
                          value={car.customModel}
                          onChange={(e) =>
                            handleUpdateDraftCar(
                              index,
                              'customModel',
                              e.target.value
                            )
                          }
                          className="w-full p-2.5 border border-emerald-300 bg-emerald-50 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          placeholder="โปรดระบุยี่ห้อ/รุ่นรถของคุณ..."
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">
                          สีรถ *
                        </label>
                        <select
                          value={car.color}
                          onChange={(e) =>
                            handleUpdateDraftCar(index, 'color', e.target.value)
                          }
                          className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
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
                          required
                          type="text"
                          value={car.plate}
                          onChange={(e) =>
                            handleUpdateDraftCar(index, 'plate', e.target.value)
                          }
                          className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                          placeholder="เช่น กข 1234"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        จังหวัด (ป้ายทะเบียน) *
                      </label>
                      <select
                        required
                        value={car.province}
                        onChange={(e) =>
                          handleUpdateDraftCar(
                            index,
                            'province',
                            e.target.value
                          )
                        }
                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                      >
                        {thaiProvinces.map((prov) => (
                          <option key={prov} value={prov}>
                            {prov}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}

                {/* ✅ ปุ่มเพิ่มรถคันใหม่ในฟอร์ม */}
                <button
                  type="button"
                  onClick={addDraftCar}
                  className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 hover:border-emerald-500 transition-all flex items-center justify-center"
                >
                  <span className="mr-2 text-xl leading-none">➕</span>{' '}
                  เพิ่มรถอีกคัน
                </button>
              </form>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white">
              <button
                type="submit"
                form="add-citizen-form"
                disabled={isAdding}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  isAdding
                    ? 'bg-gray-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                }`}
              >
                {isAdding ? 'กำลังบันทึกข้อมูล...' : 'บันทึกข้อมูลลูกค้า'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* --- MODAL: 2. เพิ่มรถคันใหม่ ให้ลูกค้าเดิม (ตาราง) --- */}
      {/* ========================================================= */}
      {showAddCarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 bg-opacity-60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-emerald-600 text-white">
              <div>
                <h3 className="font-bold text-xl">➕ เพิ่มข้อมูลรถยนต์</h3>
                <p className="text-xs text-emerald-100 mt-1">
                  ให้ลูกค้า: {selectedUserName}
                </p>
              </div>
              <button
                onClick={() => setShowAddCarModal(false)}
                className="text-emerald-100 hover:text-white font-black text-3xl leading-none"
              >
                &times;
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
              <form
                id="add-car-form"
                onSubmit={handleAddCarToExistingUser}
                className="space-y-4"
              >
                {/* โชว์แค่กล่องรถ 1 กล่องตอนกดเพิ่มจากตาราง */}
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        ยี่ห้อรถ *
                      </label>
                      <select
                        value={draftCars[0].brand}
                        onChange={(e) =>
                          handleUpdateDraftCar(0, 'brand', e.target.value)
                        }
                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                      >
                        {Object.keys(carBrandsAndModels).map((brand) => (
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
                        value={draftCars[0].model}
                        onChange={(e) =>
                          handleUpdateDraftCar(0, 'model', e.target.value)
                        }
                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                      >
                        {carBrandsAndModels[draftCars[0].brand]?.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {(draftCars[0].brand === 'อื่นๆ' ||
                    draftCars[0].model.includes('อื่นๆ') ||
                    draftCars[0].model.includes('ระบุรุ่นรถ')) && (
                    <div className="animate-fade-in">
                      <input
                        type="text"
                        required
                        value={draftCars[0].customModel}
                        onChange={(e) =>
                          handleUpdateDraftCar(0, 'customModel', e.target.value)
                        }
                        className="w-full p-2.5 border border-emerald-300 bg-emerald-50 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="โปรดระบุยี่ห้อ/รุ่นรถของคุณ..."
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        สีรถ *
                      </label>
                      <select
                        value={draftCars[0].color}
                        onChange={(e) =>
                          handleUpdateDraftCar(0, 'color', e.target.value)
                        }
                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
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
                        required
                        type="text"
                        value={draftCars[0].plate}
                        onChange={(e) =>
                          handleUpdateDraftCar(0, 'plate', e.target.value)
                        }
                        className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                        placeholder="เช่น กข 1234"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                      จังหวัด (ป้ายทะเบียน) *
                    </label>
                    <select
                      required
                      value={draftCars[0].province}
                      onChange={(e) =>
                        handleUpdateDraftCar(0, 'province', e.target.value)
                      }
                      className="w-full p-2.5 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500 text-sm bg-white"
                    >
                      {thaiProvinces.map((prov) => (
                        <option key={prov} value={prov}>
                          {prov}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-5 border-t border-gray-100 bg-white">
              <button
                type="submit"
                form="add-car-form"
                disabled={isAdding}
                className={`w-full py-4 rounded-xl font-bold text-white text-lg transition-all ${
                  isAdding
                    ? 'bg-gray-400'
                    : 'bg-emerald-600 hover:bg-emerald-700 shadow-md'
                }`}
              >
                {isAdding ? 'กำลังเพิ่มรถ...' : 'บันทึกข้อมูลรถ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
