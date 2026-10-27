import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// --- นำเข้า Components (หน้าแอดมิน) ---
import Dashboard from './components/dashboard';
import Queue from './components/queue';
import Members from './components/members';
import Price from './components/price';
import Report from './components/report';
import Settings from './components/settings';

// --- นำเข้า Components (หน้าลูกค้า LINE LIFF) ---
import Register from './components/register';
import LiffBooking from './components/liff_booking';
import LiffCheckQueue from './components/liff_check_queue';

// ✅ เพิ่ม Component หน้า Rewards ไว้ตรงนี้เพื่อให้ Build ผ่าน
const LiffRewards: React.FC = () => (
  <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center font-sans">
    <div className="w-24 h-24 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center text-5xl mb-6 shadow-sm animate-bounce">
      🎁
    </div>
    <h2 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter">
      ระบบสะสมแต้ม
    </h2>
    <p className="text-gray-500 mb-8 leading-relaxed">
      เตรียมพบกับสิทธิพิเศษและของรางวัลมากมาย
      <br />
      สำหรับลูกค้าประจำ Wow Wash เร็วๆ นี้!
    </p>
    <div className="px-6 py-2 bg-gray-100 text-gray-400 rounded-full text-xs font-bold tracking-widest uppercase border border-gray-200">
      Coming Soon
    </div>
    <button
      onClick={() => (window as any).liff?.closeWindow()}
      className="mt-12 text-emerald-600 font-bold text-sm"
    >
      กลับหน้าแชท
    </button>
  </div>
);

type MenuOption =
  | 'dashboard'
  | 'queue'
  | 'members'
  | 'price'
  | 'report'
  | 'settings';

const App: React.FC = () => {
  const [liffPage, setLiffPage] = useState<string>('register');
  const [appMode, setAppMode] = useState<
    'checking' | 'liff_citizen' | 'web_admin'
  >('checking');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [activeMenu, setActiveMenu] = useState<MenuOption>('dashboard');

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const searchParams = new URLSearchParams(window.location.search);
    const pageParam = searchParams.get('page');

    if (
      /Line/i.test(userAgent) ||
      window.location.search.includes('liff.state')
    ) {
      setAppMode('liff_citizen');
      if (pageParam) setLiffPage(pageParam);
    } else {
      setAppMode('web_admin');
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          setCurrentUser(user);
          try {
            const docRef = doc(db, 'users', user.uid);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) setUserData(docSnap.data());
          } catch (error) {
            console.error(error);
          }
        } else {
          setCurrentUser(null);
          setUserData(null);
        }
      });
    }
  }, []);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setAuthError('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    }
  };

  const handleAdminLogout = async () => {
    if (window.confirm('คุณต้องการออกจากระบบใช่หรือไม่?')) {
      await signOut(auth);
      setEmail('');
      setPassword('');
      setActiveMenu('dashboard');
    }
  };

  if (appMode === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  // --- โหมดลูกค้า LINE LIFF (เน้น Mobile 100%) ---
  if (appMode === 'liff_citizen') {
    if (liffPage === 'booking') return <LiffBooking />;
    if (liffPage === 'status') return <LiffCheckQueue />;
    if (liffPage === 'price') return <Price />;
    if (liffPage === 'rewards') return <LiffRewards />;
    return <Register />;
  }

  // --- โหมดแอดมิน (หน้า Login) ---
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gray-50 flex justify-center items-center font-sans px-4">
        <div className="w-full max-w-sm sm:max-w-md bg-white shadow-xl rounded-[2.5rem] p-8 sm:p-10 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-emerald-500 to-emerald-700 text-white rounded-3xl flex items-center justify-center text-3xl sm:text-4xl mx-auto mb-5 shadow-lg transform rotate-3">
              🚗
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
              ระบบจัดการ Wow Wash
            </h2>
          </div>
          {authError && (
            <div className="bg-red-50 text-red-600 p-3 rounded-2xl mb-6 text-xs text-center font-bold">
              {authError}
            </div>
          )}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase ml-2 mb-1">
                อีเมลผู้ดูแล
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 border-none bg-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                placeholder="admin@example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase ml-2 mb-1">
                รหัสผ่าน
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 border-none bg-gray-100 rounded-2xl focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-sm"
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-emerald-200 hover:bg-emerald-700 mt-4 active:scale-95 transition-transform"
            >
              เข้าสู่ระบบ
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-dashed border-gray-200">
            <p className="text-[10px] text-gray-300 font-bold text-center uppercase tracking-widest mb-4">
              Preview Mobile Mode
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => {
                  setLiffPage('register');
                  setAppMode('liff_citizen');
                }}
                className="text-[10px] bg-gray-50 py-2 rounded-xl font-bold text-gray-400"
              >
                📝 สมัคร
              </button>
              <button
                onClick={() => {
                  setLiffPage('booking');
                  setAppMode('liff_citizen');
                }}
                className="text-[10px] bg-emerald-50 py-2 rounded-xl font-bold text-emerald-600"
              >
                📅 จองคิว
              </button>
              <button
                onClick={() => {
                  setLiffPage('status');
                  setAppMode('liff_citizen');
                }}
                className="text-[10px] bg-blue-50 py-2 rounded-xl font-bold text-blue-600"
              >
                🔍 สถานะ
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- โหมดแอดมินที่เข้าสู่ระบบแล้ว ---
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans w-full relative">
      <header className="bg-white border-b border-gray-100 py-3 sm:py-4 px-4 sm:px-6 flex justify-between items-center sticky top-0 z-30 shadow-sm">
        <div
          className="flex items-center space-x-2 cursor-pointer active:scale-95 transition-transform"
          onClick={() => setActiveMenu('dashboard')}
        >
          <span className="text-xl sm:text-2xl">🚗</span>
          <span className="font-black text-gray-800 text-base sm:text-lg uppercase tracking-tighter">
            Wow Wash
          </span>
        </div>
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="text-right">
            <p className="text-[8px] sm:text-[10px] font-bold text-gray-300 uppercase tracking-widest leading-none">
              Admin
            </p>
            <p className="text-xs sm:text-sm font-black text-emerald-600 truncate max-w-[80px] sm:max-w-none">
              {userData?.fullName?.split(' ')[0] || 'ผู้ดูแล'}
            </p>
          </div>
          <button
            onClick={handleAdminLogout}
            className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 active:bg-red-500 active:text-white transition-all border border-red-100 shadow-sm"
          >
            🚪
          </button>
        </div>
      </header>

      <main className="flex-1 w-full overflow-y-auto flex flex-col relative pb-12">
        {activeMenu !== 'dashboard' && (
          <div className="px-4 sm:px-6 pt-4">
            <button
              onClick={() => setActiveMenu('dashboard')}
              className="flex items-center py-2 px-4 bg-white rounded-2xl text-xs sm:text-sm font-bold text-gray-500 shadow-sm border border-gray-100 active:scale-95 transition-all"
            >
              <span className="mr-2 text-emerald-500">🏠</span> กลับหน้าหลัก
            </button>
          </div>
        )}
        <div className="flex-1">
          {activeMenu === 'dashboard' && (
            <Dashboard setActiveMenu={setActiveMenu} />
          )}
          {activeMenu === 'members' && <Members />}
          {activeMenu === 'queue' && <Queue />}
          {activeMenu === 'price' && <Price />}
          {activeMenu === 'report' && <Report />}
          {activeMenu === 'settings' && <Settings />}
        </div>
      </main>
      <div className="fixed inset-0 bg-emerald-600 h-1/3 -z-10 opacity-[0.03]"></div>
    </div>
  );
};

export default App;
