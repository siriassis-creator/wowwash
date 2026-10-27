import React, { useEffect, useState } from 'react';
import liff from '@line/liff';
import { db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
  MG: [
    'Mirage',
    'Triton',
    'Pajero Sport',
    'Xpander',
    'อื่นๆ (MG3, MG5, HS, ZS)',
  ],
  Suzuki: [
    'Swift',
    'Attrage',
    'Triton',
    'Pajero Sport',
    'Xpander',
    'อื่นๆ (Celerio, Ciaz, Ertiga)',
  ],
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

// โครงสร้างฟอร์มสำหรับตอนลงทะเบียนหลายคัน
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

const Register: React.FC = () => {
  const liffId = '2009711737-KCfmze4b'; // ตรวจสอบ LIFF ID ของคุณ
  const [liffProfile, setLiffProfile] = useState<any>(null);

  // View states: โหลดข้อมูล -> ฟอร์มลงทะเบียน -> สำเร็จ -> เคยสมัครแล้ว
  const [citizenView, setCitizenView] = useState<
    'loading' | 'register' | 'success' | 'already_member'
  >('loading');

  // ข้อมูลลูกค้าทั่วไป
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State สำหรับเก็บฟอร์มรถแบบหลายคัน
  const [draftCars, setDraftCars] = useState<DraftCar[]>([
    { ...initialDraftCar },
  ]);

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

        // ตรวจสอบว่าเคยลงทะเบียนหรือยัง
        const docRef = doc(db, 'users', profile.userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          // ถ้ามีข้อมูลในระบบแล้ว ให้ไปหน้า already_member เลย
          setCitizenView('already_member');
        } else {
          // ถ้ายังไม่มีข้อมูล ให้ไปหน้า register
          setCitizenView('register');
        }
      } catch (error) {
        console.error('LIFF Init Error: ', error);
        // Fallback เวลาเทสต์บนเว็บธรรมดา
        setCitizenView('register');
      }
    };
    initLiff();
  }, []);

  // ฟังก์ชันจัดการฟอร์มรถ
  const handleUpdateDraftCar = (
    index: number,
    field: keyof DraftCar,
    value: string
  ) => {
    const updated = [...draftCars];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'brand') {
      updated[index].model = carBrandsAndModels[value]
        ? carBrandsAndModels[value][0]
        : '';
    }
    setDraftCars(updated);
  };
  const addDraftCar = () =>
    setDraftCars([...draftCars, { ...initialDraftCar }]);
  const removeDraftCar = (index: number) =>
    setDraftCars(draftCars.filter((_, i) => i !== index));

  // ฟังก์ชันบันทึกการสมัครสมาชิก
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!liffProfile) return;

    if (draftCars.some((c) => !c.plate.trim())) {
      alert('กรุณากรอกทะเบียนรถให้ครบทุกคัน');
      return;
    }

    setIsSubmitting(true);

    // แปลงข้อมูลรถเข้าฟอร์แมต CarData
    const carsToSave: CarData[] = draftCars.map((c) => {
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

    try {
      await setDoc(doc(db, 'users', liffProfile.userId), {
        uid: liffProfile.userId,
        lineUserId: liffProfile.userId,
        lineDisplayName: liffProfile.displayName,
        pictureUrl: liffProfile.pictureUrl || '',
        fullName: regFullName,
        phone: regPhone,
        cars: carsToSave, // เซฟรถทั้งหมดเป็น Array
        role: 'citizen',
        status: 'active',
        createdAt: serverTimestamp(),
      });

      // บันทึกเสร็จให้เปลี่ยนหน้าเป็น 'success'
      setCitizenView('success');
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseLiff = () => {
    if (liff.isInClient()) {
      liff.closeWindow();
    } else {
      alert('กรุณาปิดหน้าต่างนี้เพื่อกลับไปที่ LINE');
    }
  };

  // --- RENDER VIEWS ---

  // 1. หน้าโหลดข้อมูล
  if (citizenView === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // 2. หน้าฟอร์มลงทะเบียน
  if (citizenView === 'register') {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center font-sans">
        <div className="w-full max-w-md bg-white min-h-screen shadow-md pb-6">
          <div className="bg-emerald-700 text-white p-6 rounded-b-3xl shadow-md text-center">
            <h1 className="text-xl font-bold">ลงทะเบียนสมาชิกใหม่</h1>
            <p className="text-xs text-emerald-200 mt-1">
              Wow Wash & Detailing
            </p>
          </div>
          <div className="p-6">
            <div className="flex flex-col items-center mb-6">
              {liffProfile?.pictureUrl ? (
                <img
                  src={liffProfile.pictureUrl}
                  referrerPolicy="no-referrer"
                  alt="profile"
                  className="w-20 h-20 rounded-full shadow-md border-2 border-white -mt-12 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gray-200 -mt-12 border-2 border-white shadow-md"></div>
              )}
            </div>

            <form onSubmit={handleRegister} className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-3">
                  👤 ข้อมูลส่วนตัว
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ชื่อ - นามสกุล *
                    </label>
                    <input
                      required
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      placeholder="เพื่อใช้เรียกคิว"
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
                      className="w-full p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-600 bg-white"
                      placeholder="08XXXXXXXX"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-2 space-y-6">
                {draftCars.map((car, index) => (
                  <div
                    key={index}
                    className="bg-white p-4 rounded-2xl border border-emerald-100 shadow-sm relative"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-bold text-emerald-700">
                        🚗 ข้อมูลรถ (คันที่ {index + 1})
                      </h3>
                      {draftCars.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeDraftCar(index)}
                          className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded-lg"
                        >
                          ❌ ลบ
                        </button>
                      )}
                    </div>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-gray-500 mb-1">
                            ยี่ห้อรถ *
                          </label>
                          <select
                            value={car.brand}
                            onChange={(e) =>
                              handleUpdateDraftCar(
                                index,
                                'brand',
                                e.target.value
                              )
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
                              handleUpdateDraftCar(
                                index,
                                'model',
                                e.target.value
                              )
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
                              handleUpdateDraftCar(
                                index,
                                'color',
                                e.target.value
                              )
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
                              handleUpdateDraftCar(
                                index,
                                'plate',
                                e.target.value
                              )
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
                  </div>
                ))}

                {/* ปุ่มเพิ่มรถคันใหม่ */}
                <button
                  type="button"
                  onClick={addDraftCar}
                  className="w-full py-3 border-2 border-dashed border-emerald-300 text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center justify-center"
                >
                  <span className="mr-2 text-xl leading-none">➕</span>{' '}
                  เพิ่มรถอีกคัน
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full py-3.5 rounded-xl font-bold shadow-md mt-6 text-white ${
                  isSubmitting
                    ? 'bg-gray-400'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isSubmitting ? 'กำลังบันทึกข้อมูล...' : 'ยืนยันการลงทะเบียน'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 3. หน้าลงทะเบียนสำเร็จ หรือ เป็นสมาชิกอยู่แล้ว
  if (citizenView === 'success' || citizenView === 'already_member') {
    return (
      <div className="min-h-screen bg-gray-100 flex justify-center items-center font-sans p-4">
        <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-4xl mx-auto mb-6 shadow-sm">
            {citizenView === 'success' ? '🎉' : '✓'}
          </div>

          <h2 className="text-2xl font-black text-gray-800 mb-3">
            {citizenView === 'success'
              ? 'ลงทะเบียนสำเร็จ!'
              : 'คุณเป็นสมาชิกอยู่แล้ว'}
          </h2>

          <p className="text-gray-500 mb-8 text-sm leading-relaxed">
            {citizenView === 'success'
              ? 'ยินดีต้อนรับเข้าสู่ครอบครัว Wow Wash & Detailing ข้อมูลของคุณถูกบันทึกเรียบร้อยแล้ว'
              : 'คุณได้ทำการลงทะเบียนในระบบของเราเรียบร้อยแล้ว'}
            <br />
            <br />
            <span className="font-bold text-gray-700">
              คุณสามารถไปที่เมนู{' '}
              <span className="text-emerald-600">"จองคิวล้างรถ"</span> ในแชท
              LINE เพื่อรับบริการได้เลยครับ
            </span>
          </p>

          <button
            onClick={handleCloseLiff}
            className="w-full py-3.5 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all"
          >
            กลับไปที่หน้าแชท LINE
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default Register;
