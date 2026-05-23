import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User, updatePassword, reauthenticateWithCredential, EmailAuthProvider, createUserWithEmailAndPassword, getAuth } from 'firebase/auth';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc, serverTimestamp, setDoc, deleteDoc, Timestamp, orderBy, onSnapshot, limit, runTransaction } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebase-applet-config.json';
import CreateStore from './components/CreateStore';
import { 
  LayoutDashboard, 
  Store as StoreIcon, 
  Settings as SettingsIcon, 
  LogOut, 
  Package, 
  Archive,
  Users, 
  Eye,
  EyeOff,
  UserPlus,
  ArrowRight, 
  ChevronRight,
  TrendingUp, 
  ShoppingCart, 
  DollarSign,
  Bell,
  Search,
  Plus,
  Menu,
  ChevronDown,
  ChevronUp,
  Check,
  Zap,
  Armchair,
  Layers,
  X,
  Globe,
  Info,
  Minus,
  Save,
  AlertTriangle,
  Type,
  Hash,
  Palette,
  FileText,
  Package2,
  AlertCircle,
  Camera,
  Clock,
  User as UserIcon,
  Image as ImageIcon,
  Sun,
  Moon,
  Monitor,
  Languages,
  ShieldCheck,
  ShieldAlert,
  Lock,
  ListTree,
  Store,
  Printer,
  Database,
  Coins,
  FileDown,
  History,
  Copy,
  Loader2,
  Upload,
  Wrench,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { cn } from './lib/utils';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

const chartData = [
  { name: 'شەممە', sales: 4000, orders: 24 },
  { name: 'یەکشەممە', sales: 3000, orders: 13 },
  { name: 'دووشەممە', sales: 2000, orders: 98 },
  { name: 'سێشەممە', sales: 2780, orders: 39 },
  { name: 'چوارشەممە', sales: 1890, orders: 48 },
  { name: 'پێنجشەممە', sales: 2390, orders: 38 },
  { name: 'هەینی', sales: 3490, orders: 43 },
];

const normalizeDigits = (str: string) => {
  return str.replace(/[\u0660-\u0669\u06f0-\u06f9]/g, (d) => {
    return (d.charCodeAt(0) & 0xf).toString();
  });
};

const formatNumber = (val: string | number | undefined | null) => {
  if (val === undefined || val === null || val === '') return '';
  const normalized = normalizeDigits(val.toString()).replace(/,/g, '');
  const n = parseInt(normalized);
  if (isNaN(n)) return val.toString();
  return new Intl.NumberFormat('en-US').format(n);
};

// Helper to create staff user without logging out admin
const createStaffAuth = async (email: string, key: string) => {
  const secondaryAppName = `StaffCreator_${Date.now()}`;
  const secondaryApp = initializeApp(firebaseConfig, secondaryAppName);
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, key);
    return userCredential.user.uid;
  } catch (err) {
    console.error('Error creating secondary auth:', err);
    throw err;
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<'menu' | 'theme' | 'lang' | 'security' | 'categories' | 'printing'>('menu');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNotifSidebarOpen, setIsNotifSidebarOpen] = useState(false);
  const [brokenItems, setBrokenItems] = useState<any[]>([]);
  const [spareParts, setSpareParts] = useState<any[]>([]);
  const [showBrokenForm, setShowBrokenForm] = useState(false);
  const [showSpareForm, setShowSpareForm] = useState(false);
  const [sparePhoto, setSparePhoto] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const startCamera = async () => {
    setIsCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
      setIsCameraOpen(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        setSparePhoto(canvas.toDataURL('image/jpeg'));
        stopCamera();
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  };
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>(() => {
    return (localStorage.getItem('theme') as any) || 'light';
  });
  const [language, setLanguage] = useState<'ku' | 'ar'>(() => {
    return (localStorage.getItem('lang') as any) || 'ku';
  });
  const [shopName, setShopName] = useState('کۆگای ماریوان');
  const [shopMobile, setShopMobile] = useState('0750 000 0000');
  const [shopAddress, setShopAddress] = useState('هەولێر - شەقامی سەرەکی - بازاڕی کارەبا');
  const [exchangeRate, setExchangeRate] = useState('152,000');
  const [isAdmin, setIsAdmin] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const lowStockProducts = allProducts.filter(p => (p.stock || 0) <= (p.threshold || 5));
  const [todayStats, setTodayStats] = useState({ totalOrders: 0, totalSales: 0, netMovement: 0 });
  const [loginRequests, setLoginRequests] = useState([
    { id: 101, name: 'دیار ئەحمەد', email: 'diyar@shop.com', time: '١٠ خولەک پێش ئێستا', device: 'Android 14' }
  ]);
  const [sessions, setSessions] = useState([
    { id: 1, device: 'iPhone 15 Pro', location: 'Hewler, IQ', status: 'ئێستا چالاکە', color: 'bg-emerald-500', isCurrent: true },
    { id: 2, device: 'MacBook Pro 14', location: 'Hewler, IQ', status: '٢ کاتژمێر پێش ئێستا', color: 'bg-slate-300', isCurrent: false }
  ]);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ old: '', new: '' });
  const [securityTab, setSecurityTab] = useState<'profile' | 'staff'>('profile');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', msg: string } | null>(null);
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async () => {
    if (!user || !user.email) return;
    if (passwordForm.new.length < 6) {
      setFeedback({ type: 'error', msg: 'پاسۆردەکە زۆر لاوازە (لانی کەم ٦ پیت)' });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    setUpdatingPassword(true);
    try {
      // Re-authenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordForm.old);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, passwordForm.new);
      
      setFeedback({ type: 'success', msg: t('password_changed') });
      setPasswordForm({ old: '', new: '' });
    } catch (err: any) {
      console.error("Update Password Error:", err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setFeedback({ type: 'error', msg: 'پاسۆردی پێشوو هەڵەیە' });
      } else {
        setFeedback({ type: 'error', msg: 'هەڵەیەک ڕوویدا لە کاتی گۆڕینی پاسۆرد' });
      }
    } finally {
      setUpdatingPassword(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleAddStaff = async () => {
    if (!isAdmin || !storeData || !userData?.storeId) return;
    
    const staffName = prompt('ناوی کارمەند:');
    const staffEmail = prompt('ئیمێڵی کارمەند (بۆ چوونە ژوورەوە):');
    const staffKey = prompt('کلیلی باندگێشت (Invitation Key):', storeData?.invitationKey || '');
    
    if (!staffName || !staffEmail || !staffKey) return;
    
    try {
      setLoading(true);
      
      // 1. Create Auth user using secondary app (to avoid logging out)
      const staffUid = await createStaffAuth(staffEmail, staffKey);
      
      // 2. Create User Profile
      const newStaff = {
        name: staffName,
        email: staffEmail,
        role: 'staff',
        storeId: userData.storeId,
        invitationKey: staffKey,
        createdAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', staffUid), newStaff);
      setStaffMembers([...staffMembers, { id: staffUid, ...newStaff }]);
      setFeedback({ type: 'success', msg: 'کارمەندەکە بە سەرکەوتوویی زیادکرا' });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'users');
    } finally {
      setLoading(false);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (!isAdmin) return;
    if (!confirm('دڵنیای لە سڕینەوەی ئەم کارمەندە؟')) return;
    
    try {
      await deleteDoc(doc(db, 'users', id));
      setStaffMembers(staffMembers.filter(s => s.id !== id));
      setFeedback({ type: 'success', msg: 'کارمەندەکە سڕایەوە' });
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'users');
    } finally {
      setTimeout(() => setFeedback(null), 3000);
    }
  };
  const [searchQuery, setSearchQuery] = useState('');
  const [autoPrint, setAutoPrint] = useState(true);
  const [paperSize, setPaperSize] = useState('80mm');
  const [categories, setCategories] = useState([
    { 
      id: 'electrical', 
      label: 'بەشی کارەبا', 
      icon: 'Zap',
      isExpanded: false,
      items: [
        { id: 'fridge', label: 'ثلاجة' },
        { id: 'freezer', label: 'مجمدة' },
        { id: 'stove', label: 'طباخ' },
        { id: 'water_cooler', label: 'برادماء' },
        { id: 'washing_machine', label: 'غسالة' },
        { id: 'split_ac', label: 'سبلت' },
        { id: 'air_cooler', label: 'موبرده' },
        { id: 'general_elec', label: 'گشتی' },
      ]
    },
    {
      id: 'furniture',
      label: 'بەشی موبلیات',
      icon: 'Armchair',
      isExpanded: false,
      items: [
        { id: 'sofas', label: 'قنفات' },
        { id: 'plastic', label: 'بلاستيك' },
        { id: 'office_furniture', label: 'الإداري' },
        { id: 'dining_table', label: 'میز طعام' },
        { id: 'bedroom_wood', label: 'اخشاب نوم' },
        { id: 'bedroom_set', label: 'تخم نوم' },
      ]
    },
    {
      id: 'carpets',
      label: 'بەشی فەرش',
      icon: 'Layers',
      isExpanded: false,
      items: [
        { id: 'carpet_meter', label: 'فرش متر' },
        { id: 'carpet_ready', label: 'فرش جاهز' },
        { id: 'carpet_berland', label: 'فرش برلاند' },
      ]
    }
  ]);

  useEffect(() => {
    const root = window.document.documentElement;
    
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        if (e.matches) root.classList.add('dark');
        else root.classList.remove('dark');
      };
      
      updateTheme(mediaQuery);
      mediaQuery.addEventListener('change', updateTheme);
      return () => mediaQuery.removeEventListener('change', updateTheme);
    } else {
      if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('lang', language);
  }, [language]);

  const translations = {
    ku: {
      dashboard: 'داشبۆردی سەرەکی',
      stores: 'بەڕێوەبردنی کۆگاکان',
      management: 'بەشی بەڕێوەبردن',
      stats: 'ئاماری کۆگا',
      settings: 'ڕێکخستنەکان',
      logout: 'چوونە دەرەوە',
      search: 'بگەڕێ بۆ کاڵا، بەشەکان، یان ڕێکخستنەکان...',
      add: 'زیادکردن',
      admin: 'بەڕێوەبەر',
      systemManagement: 'بەڕێوەبردنی سیستم',
      appearance: 'شێوازی ڕوکار',
      lang: 'زمانی سیستم',
      security: 'ئاسایش و ئەکاونت',
      printing: 'ڕێکخستنی چاپ',
      categories: 'بەڕێوەبردنی پۆڵێنەکان',
      theme_light: 'ڕووناک',
      theme_dark: 'تۆخ',
      theme_auto: 'سیستم',
      theme_info: 'گۆڕینی شێوازی ڕوکار کاریگەری دەبێت لەسەر بەکارهێنانی وزە و ئاسودەیی چاوەکانت لە کاتی کارکردنی درێژخایەن.',
      theme_title: 'زانیاری شێواز',
      export_data: 'هەناردەکردنی هەموو داتاکان',
      import_data: 'هاوردەکردنی داتا',
      auto_print: 'چاپکردنی ئۆتۆماتیک',
      paper_size: 'قەبارەی وەرەقەی چاپکەر',
      new_category: 'پۆڵێنی نوێ',
      confirm_delete_cat: 'ئایە دڵنیای لە سڕینەوەی ئەم پۆڵێنە؟',
      new_sub_cat: 'ناوی جۆری نوێ بنووسە:',
      back_to_dashboard: 'گەڕانەوە بۆ داشبۆرد',
      under_dev: 'ئەم بەشە لە ئێستادا لە ژێر گەشەپێداندایە.',
      section: 'بەشی',
      staff_management: 'بەڕێوەبردنی کارمەندەکان',
      staff_status: 'باری چالاکی',
      staff_role: 'پلە و دەسەڵات',
      approve: 'ڕێگەپێدان',
      deny: 'ڕەتکردنەوە',
      login_requests: 'داواکارییەکانی چوونەژوورەوە',
      active_staff: 'کارمەندە چالاکەکان',
      role_admin: 'بەڕێوەبەری گشتی',
      role_manager: 'بەڕێوەبەری کۆگا',
      role_cashier: 'کاشێر / فرۆشیار',
      password_changed: 'پاسۆردەکەت بە سەرکەوتوویی گۆڕدرا',
      photo_updated: 'وێنەی پڕۆفایل نوێکرایەوە',
      product_settings: 'ڕێکخستنی کاڵا',
      new_product: 'کاڵای نوێ',
      save: 'پاشەکەوتکردن',
      product_name: 'ناوی کاڵا',
      product_code: 'کۆدی کاڵا',
      price: 'نرخ',
      stock: 'بڕ',
      low_stock_alert: 'ئاگاداری بڕی کەم',
      color: 'ڕەنگ',
      main_info: 'زانیارییە سەرەکییەکان',
      price_and_stock: 'نرخ و بڕ',
      style: 'شێواز',
      product_info_image: 'زانیاری و وێنەی کاڵا',
      product_image_desc: 'وێنەی گرتوو یان دانراو',
      capture_photo: 'وێنە بگرە',
      no_image: 'وێنە دیارینەکراوە',
      product_description: 'وەسفی وردی کاڵاکە',
      notes_description: 'تێبینی و وەسف',
      history: 'مێژووی دەستکاری',
      modified_by: 'دەستکاریلەکەر:',
      date_time: 'کات و بەروار:',
      unknown: 'دیارینەکراو',
      at_creation: 'لە کاتی دروستکردن',
      all_stores: 'هەموو کۆگاکان',
      inventory_list: 'لیستی',
    },
    ar: {
      dashboard: 'لوحة القيادة',
      stores: 'إدارة المخازن',
      management: 'قسم الإدارة',
      stats: 'إحصائيات المخزن',
      settings: 'الإعدادات',
      logout: 'تسجیل الخروج',
      search: 'ابحث عن منتج، أقسام، أو إعدادات...',
      add: 'إضافة',
      admin: 'المدير',
      systemManagement: 'إدارة النظام',
      appearance: 'المظهر',
      lang: 'لغة النظام',
      security: 'الأمان والحساب',
      printing: 'إعدادات الطباعة',
      categories: 'إدارة الفئات',
      theme_light: 'فاتح',
      theme_dark: 'داكن',
      theme_auto: 'النظام',
      theme_info: 'تغيير المظهر يؤثر على استهلاك الطاقة وراحة العين أثناء العمل لفترات طويلة.',
      theme_title: 'معلومات المظهر',
      export_data: 'تصدير جميع البيانات',
      import_data: 'استيراد البيانات',
      auto_print: 'الطباعة التلقائية',
      paper_size: 'حجم الورق للطابعة',
      new_category: 'فئة جديدة',
      confirm_delete_cat: 'هل أنت متأكد من حذف هذه الفئة؟',
      new_sub_cat: 'أدخل اسم النوع الجديد:',
      back_to_dashboard: 'العودة إلى لوحة القيادة',
      under_dev: 'هذا القسم قيد التطوير حالياً.',
      section: 'قسم',
      staff_management: 'إدارة الموظفين',
      staff_status: 'حالة النشاط',
      staff_role: 'الرتبة والصلاحيات',
      approve: 'الموافقة',
      deny: 'الرفض',
      login_requests: 'طلبات تسجيل الدخول',
      active_staff: 'الموظفون النشطون',
      role_admin: 'مدير عام',
      role_manager: 'مدير مخزن',
      role_cashier: 'كاشير / بائع',
      password_changed: 'تم تغيير كلمة المرور بنجاح',
      photo_updated: 'تم تحديث صورة الملف الشخصي',
      product_settings: 'إعدادات المنتج',
      new_product: 'منتج جديد',
      save: 'حفظ',
      product_name: 'اسم المنتج',
      product_code: 'رمز المنتج',
      price: 'السعر',
      stock: 'الكمية',
      low_stock_alert: 'تنبيه الكمية المنخفضة',
      color: 'اللون',
      main_info: 'المعلومات الأساسية',
      price_and_stock: 'السعر والكمية',
      style: 'النمط',
      product_info_image: 'معلومات وصورة المنتج',
      product_image_desc: 'الصورة الملتقطة أو الموضوعة',
      capture_photo: 'التقاط صورة',
      no_image: 'الصورة غير محددة',
      product_description: 'وصف مفصل للمنتج',
      notes_description: 'الملاحظات والوصف',
      history: 'سجل التعديلات',
      modified_by: 'المعدل من قبل:',
      date_time: 'الوقت والتاريخ:',
      unknown: 'غير معروف',
      at_creation: 'عند الإنشاء',
      all_stores: 'جميع المخازن',
      inventory_list: 'قائمة',
    }
  };

  const t = (key: keyof typeof translations['ku']) => {
    return translations[language][key] || translations['ku'][key];
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Fetch User Data
        const userRef = doc(db, 'users', currentUser.uid);
        getDoc(userRef).then((userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data();
            setUserData(data);
            setIsAdmin(data.role === 'owner' || data.role === 'admin');
            
            // Fetch Store Data
            if (data.storeId) {
              const storeRef = doc(db, 'stores', data.storeId);
              getDoc(storeRef).then((storeSnap) => {
                if (storeSnap.exists()) {
                  const sData = storeSnap.data();
                  setStoreData({ id: storeSnap.id, ...sData });
                  
                  // Auto-repair missing invitation key for owners
                  if (data.role === 'owner' && !sData.invitationKey) {
                    const newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
                    updateDoc(storeRef, { invitationKey: newKey }).then(() => {
                      setStoreData((prev: any) => ({ ...prev, invitationKey: newKey }));
                    });
                  }
                }
              });

              // Fetch Staff Members if Admin
              if (data.role === 'owner' || data.role === 'admin') {
                const staffQuery = query(collection(db, 'users'), where('storeId', '==', data.storeId), where('role', '==', 'staff'));
                getDocs(staffQuery).then((snap) => {
                  setStaffMembers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                });
              }

              // Fetch Movements - Larger range for stats
              const statsRangeDate = new Date();
              statsRangeDate.setMonth(statsRangeDate.getMonth() - 12); // Last 12 months for analytics
              const startOfStatsRange = Timestamp.fromDate(statsRangeDate);
              
              const movementsQuery = query(
                collection(db, 'stores', data.storeId, 'movements'),
                where('createdAt', '>=', startOfStatsRange),
                orderBy('createdAt', 'desc')
              );

              const unsubMovements = onSnapshot(movementsQuery, (snap) => {
                const movs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setMovements(movs);
                
                // Calculate today's stats (filter in JS to keep one listener)
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                const stats = movs.filter((m: any) => m.createdAt.toDate() >= today).reduce((acc, current: any) => {
                  if (current.type === 'sale') {
                    acc.totalOrders += 1;
                    // Handle currency conversion
                    const currentRate = parseInt(exchangeRate.replace(/,/g, '')) || 152000;
                    const priceInIQD = current.currency === 'USD' ? (current.price || 0) * (currentRate / 100) : (current.price || 0); // Assuming user enters USD like 100
                    acc.totalSales += (current.amount || 0) * priceInIQD;
                  }
                  acc.netMovement += current.amount || 0;
                  return acc;
                }, { totalOrders: 0, totalSales: 0, netMovement: 0 });
                
                setTodayStats(stats);
              }, (err) => {
                console.error("Movements fetch error:", err);
              });

              const productsQuery = query(collection(db, 'stores', data.storeId, 'products'));
              const unsubProducts = onSnapshot(productsQuery, (snap) => {
                setAllProducts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Product[]);
              }, (err) => {
                handleFirestoreError(err, OperationType.GET, 'products');
              });

              const brokenQuery = query(collection(db, 'stores', data.storeId, 'brokenItems'), orderBy('createdAt', 'desc'));
              const unsubBroken = onSnapshot(brokenQuery, (snap) => {
                setBrokenItems(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
              }, (err) => {
                handleFirestoreError(err, OperationType.GET, 'brokenItems');
              });

              const spareQuery = query(collection(db, 'stores', data.storeId, 'spareParts'), orderBy('createdAt', 'desc'));
              const unsubSpare = onSnapshot(spareQuery, (snap) => {
                setSpareParts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
              }, (err) => {
                handleFirestoreError(err, OperationType.GET, 'spareParts');
              });

              return () => {
                unsubMovements();
                unsubProducts();
                unsubBroken();
                unsubSpare();
              };
            }
          }
        });
      } else {
        setUserData(null);
        setStoreData(null);
        setIsAdmin(false);
        setStaffMembers([]);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 font-sans selection:bg-blue-100 flex flex-col transition-colors duration-300" dir="rtl">
      {user ? (
        <div className="flex flex-1 h-screen overflow-hidden relative">
          {/* Mobile Overlay */}
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
              />
            )}
          </AnimatePresence>
 
          {/* Sidebar drawer */}
          <motion.aside 
            initial={false}
            animate={{ 
              x: isSidebarOpen ? 0 : '100%',
              width: isSidebarOpen ? (window.innerWidth < 1024 ? '100%' : '300px') : '0px'
            }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex flex-col bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 transition-all duration-300 overflow-hidden",
              isSidebarOpen ? "p-6" : "p-0 px-0"
            )}
          >
            <div className="flex items-center justify-between mb-10 w-full whitespace-nowrap">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 dark:bg-white dark:text-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                  <StoreIcon size={22} />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white leading-none">{t('management')}</h1>
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">KurdOS Panel</span>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors lg:hidden text-slate-600 dark:text-slate-400"
              >
                <X size={20} />
              </button>
            </div>
 
            <nav className="flex-1 space-y-1 overflow-y-auto custom-scrollbar w-full whitespace-nowrap">
              {/* Main Dashboard */}
              <button
                onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(window.innerWidth >= 1024); }}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group",
                  activeTab === 'dashboard' 
                    ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-200 dark:shadow-none" 
                    : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <LayoutDashboard size={20} className={cn(activeTab === 'dashboard' ? "text-white dark:text-slate-900" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                <span>{t('dashboard')}</span>
              </button>
 
              {/* Store Section with Sub-categories */}
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab('all_stores')}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group",
                    activeTab === 'all_stores' 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-200 dark:shadow-none" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <StoreIcon size={20} className={cn(activeTab === 'all_stores' ? "text-white dark:text-slate-900" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                  <span>{t('stores')}</span>
                </button>
              </div>

              {/* Dynamic Categories */}
              {categories.map((cat, index) => {
                const Icon = cat.icon === 'Zap' ? Zap : cat.icon === 'Armchair' ? Armchair : Layers;
                return (
                  <div key={cat.id} className="space-y-1">
                    <button
                      onClick={() => {
                        const newCats = [...categories];
                        newCats[index].isExpanded = !newCats[index].isExpanded;
                        setCategories(newCats);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all text-slate-500 hover:bg-slate-50 hover:text-slate-900 group"
                      )}
                    >
                      <Icon size={20} className="text-slate-400 group-hover:text-slate-900" />
                      <span>{cat.label}</span>
                      <ChevronDown size={16} className={cn("mr-auto transition-transform", cat.isExpanded && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {cat.isExpanded && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pr-4 space-y-1"
                        >
                          {cat.items.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => { setActiveTab(sub.id); setIsSidebarOpen(window.innerWidth >= 1024); }}
                              className={cn(
                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-[13px] transition-all group relative",
                                activeTab === sub.id 
                                  ? (index === 0 ? "bg-blue-50 text-blue-600 dark:bg-blue-900/10" : index === 1 ? "bg-amber-50 text-amber-600 dark:bg-amber-900/10" : "bg-red-50 text-red-600 dark:bg-red-900/10")
                                  : "text-slate-400 hover:text-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
                              )}
                            >
                              <span>{sub.label}</span>
                              <span className="mr-auto text-[10px] font-bold text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors uppercase tracking-tight">
                                {allProducts.filter(p => p.category === sub.id).length} کاڵا
                              </span>
                              {activeTab === sub.id && (
                                <motion.div layoutId={`activeSub${cat.id}`} className={cn("absolute right-0 w-1 h-6 rounded-l-full", index === 0 ? "bg-blue-600" : index === 1 ? "bg-amber-600" : "bg-red-600")} />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {[
                { id: 'maintenance', label: 'یەدەگ و شکان', icon: Wrench },
                { id: 'stats', label: t('stats'), icon: TrendingUp },
                { id: 'settings', label: t('settings'), icon: SettingsIcon },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setIsSidebarOpen(window.innerWidth >= 1024); }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all group",
                    activeTab === item.id 
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xl shadow-slate-200 dark:shadow-none" 
                      : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  )}
                >
                  <item.icon size={20} className={cn(activeTab === item.id ? "text-white dark:text-slate-900" : "text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white")} />
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
 
            <div className="mt-auto pt-6 border-t border-slate-100 dark:border-slate-800 w-full whitespace-nowrap">
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-xl flex items-center justify-center font-bold">
                  {user.email?.[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{userData?.name || t('admin')}</p>
                  <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                </div>
              </div>
              <button 
                onClick={() => auth.signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={20} />
                <span>{t('logout')}</span>
              </button>
            </div>
          </motion.aside>

          {/* Main Content */}
          <main className={cn(
            "flex-1 overflow-y-auto transition-all duration-500",
            isSidebarOpen ? "lg:mr-[300px]" : "mr-0"
          )}>
            <div className="p-6 lg:p-10 max-w-7xl mx-auto">
              {/* Header with hamburger */}
              <header className="flex items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-4 flex-1">
                  <button 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95 shrink-0"
                  >
                    <Menu size={24} />
                  </button>
                  
                  <div className="relative w-full max-w-xl">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text" 
                      placeholder={t('search')} 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pr-12 pl-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 dark:focus:ring-white/5 focus:border-slate-300 dark:focus:border-slate-700 transition-all text-sm font-medium shadow-sm text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
 
                <div className="flex items-center gap-3 shrink-0">
                  <button 
                    onClick={() => {
                      setActiveTab('maintenance');
                      setIsSidebarOpen(window.innerWidth >= 1024);
                    }}
                    className={cn(
                      "p-3.5 border rounded-2xl transition-all active:scale-95 group",
                      activeTab === 'maintenance'
                        ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none"
                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm"
                    )}
                    title="یەدەگ و شکان"
                  >
                    <Wrench size={22} className={cn("group-hover:rotate-[15deg] transition-transform", activeTab === 'maintenance' ? "text-white" : "text-blue-500")} />
                  </button>

                  <button 
                    onClick={() => setIsNotifSidebarOpen(true)}
                    className="relative p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all active:scale-95 group"
                  >
                    <motion.div
                      animate={lowStockProducts.length > 0 ? { rotate: [0, -10, 10, -10, 10, 0] } : {}}
                      transition={{ repeat: Infinity, duration: 2, repeatDelay: 8 }}
                    >
                      <Bell size={22} className="group-hover:rotate-[15deg] transition-transform" />
                    </motion.div>
                    {lowStockProducts.length > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-black border-2 border-white dark:border-slate-950 shadow-sm ring-2 ring-amber-500/20">
                        {lowStockProducts.length}
                      </span>
                    )}
                  </button>

                  <button className="hidden sm:flex items-center gap-2 px-6 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-sm shadow-xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-95 leading-none">
                    <Plus size={20} />
                    <span>{t('add')}</span>
                  </button>
                </div>
              </header>

              <AnimatePresence mode="wait">
                {activeTab === 'dashboard' ? (
                  <motion.div
                    key="dashboard"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="grid grid-cols-12 gap-6"
                  >
                    {/* Currency Exchange - Compact Live List */}
                    <div className="col-span-12">
                      <ExchangeRateCard />
                    </div>

                    {/* Statistics - Activity Stats */}
                    <div className="col-span-12 lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                            <TrendingUp size={20} />
                          </div>
                          <span className="text-[10px] text-emerald-600 font-black bg-emerald-50 px-2 py-0.5 rounded-md uppercase">ئەمڕۆ</span>
                        </div>
                        <div>
                          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{formatNumber(todayStats.totalSales)}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">کۆی فرۆشی ئەمڕۆ (دینار)</p>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                            <ShoppingCart size={20} />
                          </div>
                        </div>
                        <div>
                          <p className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{todayStats.totalOrders}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">ژمارەی جموجۆڵەکانی ئەمڕۆ</p>
                        </div>
                      </motion.div>

                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="bg-slate-900 dark:bg-white p-6 rounded-[32px] shadow-xl shadow-slate-200 dark:shadow-none flex flex-col justify-between group"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-10 h-10 bg-white/20 dark:bg-slate-900/10 rounded-xl flex items-center justify-center text-white dark:text-slate-900">
                            <Zap size={20} />
                          </div>
                        </div>
                        <div className="text-white dark:text-slate-900">
                          <p className="text-sm font-bold opacity-80 mb-1">دواین گۆڕانکاری</p>
                          <p className="text-xs font-bold truncate">
                            {movements.length > 0 ? movements[0].productName : 'هیچ چاڵاکییەک نییە'}
                          </p>
                        </div>
                      </motion.div>
                    </div>


                    <div className="col-span-12 lg:col-span-8 bento-card p-8 bg-white/50 backdrop-blur-sm border border-slate-100 dark:border-slate-800 shadow-none h-full flex flex-col overflow-hidden min-h-[400px]">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                           <div className="w-8 h-8 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center">
                              <History size={16} />
                           </div>
                           <h4 className="text-right text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-widest">جموجۆڵەکانی ٢٤ کاژمێری ڕابردوو</h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold">{movements.length} چاڵاکی</span>
                      </div>

                      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 px-2">
                        {movements.length > 0 ? (
                          movements.map((m, i) => (
                            <motion.div 
                              key={m.id}
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-white dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-50 dark:border-slate-800 flex items-center justify-between group hover:border-blue-100 dark:hover:border-blue-900 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center",
                                  m.type === 'sale' ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20" : 
                                  m.type === 'stock_in' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20" : "bg-red-50 text-red-600"
                                )}>
                                  {m.type === 'sale' ? <ShoppingCart size={18} /> : 
                                   m.type === 'stock_in' ? <Plus size={18} /> : <Minus size={18} />}
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{m.productName}</p>
                                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">بەشی {m.userName} • {new Date((m.createdAt as any)?.toDate()).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>
                              <div className="text-left">
                                <p className={cn(
                                  "text-sm font-black",
                                  m.type === 'sale' ? "text-emerald-600" : "text-slate-900 dark:text-white"
                                )}>
                                  {m.type === 'sale' ? '+' : ''}{formatNumber((m.amount || 0) * (m.price || 0))}
                                </p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">دینار</p>
                              </div>
                            </motion.div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-700 py-10">
                            <History size={40} strokeWidth={1} className="mb-2" />
                            <p className="text-[11px] font-black uppercase tracking-wider">هیچ جموجۆڵێک هێشتا نییە</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ) : activeTab === 'maintenance' ? (
                  <motion.div 
                    key="maintenance"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="col-span-12"
                  >
                    <MaintenanceView 
                      brokenItems={brokenItems} 
                      spareParts={spareParts} 
                      setShowBrokenForm={setShowBrokenForm}
                      setShowSpareForm={setShowSpareForm}
                      setSelectedImage={setSelectedImage}
                      userData={userData}
                      t={t}
                    />
                  </motion.div>
                ) : activeTab === 'stats' ? (
                  <motion.div 
                    key="stats"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="col-span-12"
                  >
                    <StatsView movements={movements} products={allProducts} exchangeRate={exchangeRate} t={t} />
                  </motion.div>
                ) : activeTab === 'settings' ? (
                  <motion.div
                    key="settings"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="col-span-12 space-y-8 pb-20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        {settingsSubTab !== 'menu' && (
                          <button 
                            onClick={() => setSettingsSubTab('menu')}
                            className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-900 shadow-sm transition-all active:scale-90"
                          >
                            <ArrowRight size={20} className="rotate-180" />
                          </button>
                        )}
                        <div>
                          <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">{t('settings')}</h2>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                            {settingsSubTab === 'menu' ? t('systemManagement') : 
                             settingsSubTab === 'theme' ? t('appearance') :
                             settingsSubTab === 'lang' ? t('lang') :
                             settingsSubTab === 'security' ? t('security') :
                             settingsSubTab === 'printing' ? t('printing') : t('categories')}
                          </p>
                        </div>
                      </div>
                    </div>
 
                    {settingsSubTab === 'menu' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
                        {[
                          { id: 'categories', label: t('categories'), desc: 'Category Management', icon: ListTree, color: 'text-blue-600', bg: 'bg-blue-50' },
                          { id: 'security', label: t('security'), desc: 'Security & Access', icon: ShieldCheck, color: 'text-slate-900 dark:text-white', bg: 'bg-slate-100 dark:bg-slate-800' },
                          { id: 'printing', label: t('printing'), desc: 'Printer Settings', icon: Printer, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                          { id: 'theme', label: t('appearance'), desc: 'System Theme', icon: Palette, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800' },
                          { id: 'lang', label: t('lang'), desc: 'System Language', icon: Languages, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        ].map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSettingsSubTab(item.id as any)}
                            className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-sm hover:shadow-xl hover:shadow-slate-100 dark:hover:shadow-none transition-all text-right group active:scale-[0.98]"
                          >
                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shrink-0", item.bg, item.color)}>
                              <item.icon size={20} />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200 group-hover:text-blue-600 transition-colors uppercase">{item.label}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{item.desc}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="max-w-3xl mx-auto w-full">
                        {settingsSubTab === 'security' && (
                          <div className="space-y-6">
                            {/* Security Sub-Nav */}
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit mx-auto md:mx-0">
                              <button 
                                onClick={() => setSecurityTab('profile')}
                                className={cn(
                                  "px-6 py-2 rounded-xl text-xs font-black transition-all",
                                  securityTab === 'profile' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-400"
                                )}
                              >
                                پڕۆفایلی من
                              </button>
                              {isAdmin && (
                                <button 
                                  onClick={() => setSecurityTab('staff')}
                                  className={cn(
                                    "px-6 py-2 rounded-xl text-xs font-black transition-all",
                                    securityTab === 'staff' ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm" : "text-slate-400"
                                  )}
                                >
                                  {t('staff_management')}
                                </button>
                              )}
                            </div>

                            <AnimatePresence mode="wait">
                              {feedback && (
                                <motion.div 
                                  initial={{ opacity: 0, y: -20 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.9 }}
                                  className={cn(
                                    "p-4 rounded-2xl flex items-center gap-3 font-bold text-sm mb-6",
                                    feedback.type === 'success' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                                  )}
                                >
                                  {feedback.type === 'success' ? <Check size={18} /> : <X size={18} />}
                                  {feedback.msg}
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {securityTab === 'profile' ? (
                              <div className="space-y-6">
                                {/* Profile Card */}
                                <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm relative group">
                                  <div className="absolute top-0 right-0 w-40 h-40 bg-blue-500/5 blur-[80px] rounded-full -mr-20 -mt-20"></div>
                                  <div className="p-8 relative z-10">
                                    <div className="flex flex-col md:flex-row items-center gap-6">
                                      <div className="relative group/avatar">
                                        <div className="w-24 h-24 bg-slate-900 dark:bg-white rounded-3xl flex items-center justify-center text-white dark:text-slate-900 text-3xl font-black shadow-2xl relative z-10">
                                          {user.email?.[0].toUpperCase()}
                                        </div>
                                        <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-[28px] blur opacity-20 group-hover/avatar:opacity-40 transition-opacity"></div>
                                        <button 
                                          onClick={() => {
                                            setFeedback({ type: 'success', msg: t('photo_updated') });
                                            setTimeout(() => setFeedback(null), 3000);
                                          }}
                                          className="absolute -bottom-2 -left-2 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 shadow-xl text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors z-20"
                                        >
                                          <Camera size={16} />
                                        </button>
                                      </div>
                                      <div className="text-center md:text-right flex-1">
                                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1 flex items-center justify-center md:justify-start gap-2">
                                          {userData?.name || user.email?.split('@')[0]}
                                          <ShieldCheck className="text-blue-500" size={24} />
                                        </h3>
                                        <p className="text-sm font-bold text-slate-400 mb-4">{user.email}</p>
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                                          <span className={cn(
                                            "px-3 py-1 text-[10px] font-black rounded-lg border",
                                            isAdmin 
                                              ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800"
                                              : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-800"
                                          )}>
                                            {isAdmin ? 'بەڕێوەبەری سەرەکی (Admin)' : 'کارمەندی چالاک (Staff)'}
                                          </span>
                                          <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-lg border border-blue-100 dark:border-blue-800">ئەکاونتی ڤێریفاید</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </section>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                  {/* Password & Creds */}
                                  <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 relative overflow-hidden">
                                    <div className="absolute top-0 left-0 w-32 h-32 bg-slate-900/[0.02] dark:bg-white/[0.02] rounded-full -ml-16 -mt-16"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl flex items-center justify-center shadow-inner">
                                          <Lock size={22} />
                                        </div>
                                        <div>
                                          <h4 className="text-base font-black text-slate-900 dark:text-white">گۆڕینی ژمارەی نهێنی</h4>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Update Security Credentials</p>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-5 relative z-10">
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">پاسۆردی پێشوو</label>
                                        <div className="relative group">
                                          <input 
                                            type={showOldPassword ? "text" : "password"}
                                            value={passwordForm.old}
                                            onChange={(e) => setPasswordForm({...passwordForm, old: e.target.value})}
                                            placeholder="••••••••" 
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[20px] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 dark:focus:border-blue-800 transition-all text-sm dark:text-white font-mono" 
                                          />
                                          <button 
                                            onClick={() => setShowOldPassword(!showOldPassword)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                          >
                                            {showOldPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">پاسۆردی نوێ</label>
                                        <div className="relative group">
                                          <input 
                                            type={showNewPassword ? "text" : "password"}
                                            value={passwordForm.new}
                                            onChange={(e) => setPasswordForm({...passwordForm, new: e.target.value})}
                                            placeholder="••••••••" 
                                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-[20px] outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-300 dark:focus:border-blue-800 transition-all text-sm dark:text-white font-mono" 
                                          />
                                          <button 
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                                          >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                          </button>
                                        </div>
                                      </div>
                                      <button 
                                        onClick={handleUpdatePassword}
                                        disabled={updatingPassword}
                                        className="w-full py-4.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[20px] font-black text-sm shadow-2xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-slate-100 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50"
                                      >
                                        {updatingPassword ? (
                                          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <>
                                            تازەکردنەوەی نهێنوشە
                                            <ArrowRight size={18} />
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </section>

                                  {/* Sessions & Privacy */}
                                  <section className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/[0.02] rounded-full -mr-16 -mt-16"></div>
                                    <div className="flex items-center justify-between relative z-10">
                                      <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center shadow-inner">
                                          <Globe size={22} />
                                        </div>
                                        <div>
                                          <h4 className="text-base font-black text-slate-900 dark:text-white">ئامێرە چالاکەکان</h4>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Active Login Locations</p>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                      {sessions.map((session) => (
                                        <div key={session.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800 transition-all group hover:border-blue-200 dark:hover:border-blue-900 cursor-default">
                                          <div className="flex items-center gap-4 text-right">
                                            <div className={cn(
                                              "w-3 h-3 rounded-full relative",
                                              session.color
                                            )}>
                                              {session.isCurrent && (
                                                <div className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-40"></div>
                                              )}
                                            </div>
                                            <div>
                                              <p className="text-sm font-black text-slate-800 dark:text-slate-100">{session.device}</p>
                                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{session.location} • {session.isCurrent ? 'ئەم پەنێڵە' : session.status}</p>
                                            </div>
                                          </div>
                                          {!session.isCurrent && (
                                            <button 
                                              onClick={() => setSessions(sessions.filter(s => s.id !== session.id))}
                                              className="w-10 h-10 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all shadow-sm flex items-center justify-center border border-slate-100 dark:border-slate-700 active:scale-90"
                                            >
                                              <X size={18} />
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                      <button 
                                        onClick={() => {
                                          setSessions(sessions.filter(s => s.isCurrent));
                                          auth.signOut();
                                        }}
                                        className="w-full py-4 bg-red-50 dark:bg-red-950/20 text-red-600 text-[11px] font-black rounded-[20px] border border-red-100 dark:border-red-900/30 hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-[0.98]"
                                      >
                                        داخستنی هەموو دانیشتنەکان
                                      </button>
                                    </div>
                                  </section>
                                </div>
                              </div>
                              ) : (
                                isAdmin ? (
                                  <div className="space-y-6">
                                    {/* Staff Management Header & Invitation Key */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                      {/* Invitation Key Card */}
                                      <section className="md:col-span-2 bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[32px] text-white shadow-xl shadow-blue-100 dark:shadow-none relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-all duration-500"></div>
                                        <div className="relative z-10">
                                          <div className="flex items-center gap-3 mb-6">
                                            <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                                              <UserPlus size={24} className="text-white" />
                                            </div>
                                            <div>
                                              <h4 className="text-lg font-black">{t('staff_management')}</h4>
                                              <p className="text-xs text-blue-100 font-bold opacity-80">بانگێشتکردنی ئەندامانی نوێ</p>
                                            </div>
                                          </div>
                                          
                                          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-2">
                                            <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-3">کلیلی فەرمی بانگێشتکردن</p>
                                            <div className="flex items-center justify-between gap-4">
                                              <span className="text-3xl font-black tracking-[0.2em] font-mono select-all uppercase">
                                                {storeData?.invitationKey || '------'}
                                              </span>
                                              <button 
                                                onClick={() => {
                                                  if (storeData?.invitationKey) {
                                                    navigator.clipboard.writeText(storeData.invitationKey);
                                                    setFeedback({ type: 'success', msg: 'کلیلەکە کۆپی کرا' });
                                                    setTimeout(() => setFeedback(null), 3000);
                                                  }
                                                }}
                                                className="px-6 py-3 bg-white text-blue-600 rounded-xl font-black text-xs hover:bg-blue-50 transition-all active:scale-95 shadow-lg shadow-black/10"
                                              >
                                                کۆپی کلیل
                                              </button>
                                            </div>
                                          </div>
                                          <p className="text-[10px] text-blue-100/60 font-medium px-2 italic">
                                            * ئەم کلیلە بدە بە کارمەندی نوێ بۆ ئەوەی بتوانێت بچێتە ژوورەوە.
                                          </p>
                                        </div>
                                      </section>

                                      {/* Staff Overview Stat */}
                                      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 rounded-[32px] flex flex-col justify-center text-center shadow-sm">
                                        <Users className="mx-auto text-blue-500 mb-4" size={40} />
                                        <h5 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-1">کۆی کارمەندەکان</h5>
                                        <p className="text-4xl font-black text-slate-900 dark:text-white leading-none mb-2">{staffMembers.length}</p>
                                        <p className="text-[10px] text-emerald-500 font-bold">هەموویان چالاکن</p>
                                      </section>
                                    </div>

                                    {/* Login Requests */}
                                    {loginRequests.length > 0 && (
                                      <section className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 p-6 rounded-[32px] space-y-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white dark:bg-slate-900 text-amber-600 rounded-xl flex items-center justify-center shadow-sm">
                                              <UserPlus size={20} />
                                            </div>
                                            <div>
                                              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">{t('login_requests')}</h4>
                                              <p className="text-[10px] text-amber-700/60 font-bold px-1">داواکاری نوێ بۆ چوونە ژوورەوە</p>
                                            </div>
                                          </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {loginRequests.map((req) => (
                                            <div key={req.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/20 shadow-sm flex items-center justify-between">
                                              <div className="text-right">
                                                <p className="text-xs font-black text-slate-900 dark:text-white">{req.name}</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase">{req.device} • {req.time}</p>
                                              </div>
                                              <div className="flex gap-2">
                                                <button 
                                                  onClick={() => {
                                                    setLoginRequests(prev => prev.filter(r => r.id !== req.id));
                                                    setFeedback({ type: 'success', msg: 'ڕێگەت دا بە کارمەندی نوێ' });
                                                    setTimeout(() => setFeedback(null), 3000);
                                                  }}
                                                  className="px-4 py-2 bg-emerald-500 text-white text-[10px] font-black rounded-lg shadow-lg shadow-emerald-200 active:scale-95 transition-all"
                                                >
                                                  {t('approve')}
                                                </button>
                                                <button 
                                                  onClick={() => {
                                                    setLoginRequests(prev => prev.filter(r => r.id !== req.id));
                                                    setFeedback({ type: 'error', msg: 'داواکارییەکە ڕەتکرایەوە' });
                                                    setTimeout(() => setFeedback(null), 3000);
                                                  }}
                                                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-black rounded-lg active:scale-95 transition-all"
                                                >
                                                  {t('deny')}
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </section>
                                    )}

                                    {/* Staff List */}
                                    <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
                                      <div className="p-6 border-b border-slate-50 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-6">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
                                              <Users size={20} />
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white">{t('active_staff')}</h4>
                                          </div>
                                          <button 
                                            onClick={handleAddStaff}
                                            className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-xl shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
                                          >
                                            <Plus size={14} />
                                            کارمەندی نوێ
                                          </button>
                                        </div>
                                        
                                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                          <div className="flex items-center justify-between">
                                            <div className="text-right">
                                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">ئیمێڵی کۆگا بۆ چوونەژوورەوە</p>
                                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{storeData?.email || 'بەڵێننامەی فەرمی'}</p>
                                            </div>
                                            <div className="text-left">
                                              <p className="text-[10px] font-black text-slate-400 uppercase mb-1">پڕۆتۆکۆڵی پاراستن</p>
                                              <p className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">SSL/TLS ACTIVE</p>
                                            </div>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {staffMembers.length > 0 ? staffMembers.map((staff) => (
                                          <div key={staff.id} className="p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center gap-4 text-right">
                                              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 font-bold uppercase text-[12px]">
                                                {staff.name?.[0] || 'S'}
                                              </div>
                                              <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white">{staff.name}</p>
                                                <div className="flex items-center gap-2">
                                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{staff.email}</p>
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-md font-mono font-black select-all border border-blue-100 dark:border-blue-800/50">
                                                      🔑 {staff.invitationKey}
                                                    </span>
                                                    <button 
                                                      onClick={() => {
                                                        navigator.clipboard.writeText(staff.invitationKey);
                                                        setFeedback({ type: 'success', msg: `کلیلی ${staff.name} کۆپی کرا` });
                                                        setTimeout(() => setFeedback(null), 3000);
                                                      }}
                                                      className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                                                      title="کۆپیکردن"
                                                    >
                                                      <Copy size={12} />
                                                    </button>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                              <div className="hidden sm:flex flex-col items-end mr-4">
                                                <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase">
                                                  {staff.role === 'manager' ? t('role_manager') : t('role_cashier')}
                                                </span>
                                                <span className="text-[8px] text-slate-400 font-bold">لەوەتەی {staff.createdAt?.toDate?.()?.toLocaleDateString() || '٢٠٢٤'}</span>
                                              </div>
                                              <button 
                                                onClick={() => handleDeleteStaff(staff.id)}
                                                className="p-2 text-slate-300 hover:text-red-500 transition-colors bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700 shadow-sm"
                                              >
                                                <Trash2 size={16} />
                                              </button>
                                            </div>
                                          </div>
                                        )) : (
                                          <div className="p-12 text-center">
                                            <p className="text-sm font-bold text-slate-400 italic">هیچ کارمەندێک نییە</p>
                                          </div>
                                        )}
                                      </div>
                                    </section>
                                  </div>
                                ) : (
                                  <div className="p-12 text-center bg-slate-50 dark:bg-slate-900/50 rounded-[32px] border border-dashed border-slate-200 dark:border-slate-800">
                                    <ShieldAlert className="mx-auto mb-4 text-slate-300" size={48} />
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white mb-2">دەستگەیشتن ڕەتکرایەوە</h4>
                                    <p className="text-sm text-slate-400 font-medium">تەنها بەڕێوەبەر دەتوانێت ئەم بەشە ببێنێت</p>
                                  </div>
                                )
                              )}
                          </div>
                        )}
 
                        {settingsSubTab === 'lang' && (
                          <section className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
                                 <Languages size={20} />
                               </div>
                               <h3 className="text-base font-black text-slate-900 dark:text-white">{t('lang')}</h3>
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                              {[
                                { id: 'ku', label: 'کوردی (سۆرانی)', desc: 'Kurdish Sorani', flag: '☀️' },
                                { id: 'ar', label: 'العربية', desc: 'Arabic Language', flag: '🌙' }
                              ].map((lang) => (
                                <button 
                                  key={lang.id}
                                  onClick={() => setLanguage(lang.id as any)}
                                  className={cn(
                                    "flex items-center justify-between p-4 rounded-2xl border transition-all text-right",
                                    language === lang.id 
                                      ? "bg-emerald-50 dark:bg-emerald-900/40 border-emerald-500 ring-4 ring-emerald-500/5" 
                                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                                  )}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="text-2xl">{lang.flag}</div>
                                    <div>
                                      <span className={cn("text-sm font-black block", language === lang.id ? "text-emerald-700 dark:text-emerald-400" : "text-slate-700 dark:text-slate-200")}>{lang.label}</span>
                                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{lang.desc}</span>
                                    </div>
                                  </div>
                                  {language === lang.id && <Check className="text-emerald-600 dark:text-emerald-400" size={20} />}
                                </button>
                              ))}
                            </div>
                          </section>
                        )}
 
                        {settingsSubTab === 'theme' && (
                          <section className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-8">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl flex items-center justify-center">
                                 <Palette size={20} />
                               </div>
                               <h3 className="text-base font-black text-slate-900 dark:text-white">{t('appearance')}</h3>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              {[
                                { id: 'light', label: t('theme_light'), icon: Sun, color: 'bg-white' },
                                { id: 'dark', label: t('theme_dark'), icon: Moon, color: 'bg-slate-900' },
                                { id: 'auto', label: t('theme_auto'), icon: Monitor, color: 'bg-gradient-to-br from-white to-slate-900' }
                              ].map((tItem) => (
                                <button 
                                  key={tItem.id}
                                  onClick={() => setTheme(tItem.id as any)}
                                  className={cn(
                                    "flex flex-col gap-4 p-5 rounded-[24px] border-2 transition-all relative overflow-hidden group justify-between h-full",
                                    theme === tItem.id 
                                      ? "border-slate-900 dark:border-white bg-slate-50 dark:bg-slate-800 shadow-xl shadow-slate-100 dark:shadow-none" 
                                      : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-600"
                                  )}
                                >
                                  <div className={cn("w-full h-20 rounded-xl border border-slate-200/50 shadow-inner", tItem.color)} />
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      <tItem.icon size={16} className={cn(theme === tItem.id ? "text-slate-900 dark:text-white" : "text-slate-400")} />
                                      <span className={cn("text-xs font-black", theme === tItem.id ? "text-slate-900 dark:text-white" : "text-slate-500")}>{tItem.label}</span>
                                    </div>
                                    <AnimatePresence>
                                      {theme === tItem.id && (
                                        <motion.div 
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="w-5 h-5 bg-slate-900 dark:bg-white rounded-full flex items-center justify-center text-white dark:text-slate-900"
                                        >
                                          <Check size={12} />
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                </button>
                              ))}
                            </div>
 
                            <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-[24px] border border-blue-100 dark:border-blue-900 flex items-start gap-4">
                              <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shadow-sm shrink-0">
                                <Info size={20} />
                              </div>
                              <div className="text-right">
                                <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 mb-1">{t('theme_title')}</h4>
                                <p className="text-[10px] text-blue-700/70 dark:text-blue-400/70 font-bold leading-relaxed">
                                  {t('theme_info')}
                                </p>
                              </div>
                            </div>
                          </section>
                        )}

                        {settingsSubTab === 'printing' && (
                          <section className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                                 <Printer size={20} />
                               </div>
                               <h3 className="text-base font-black text-slate-900 dark:text-white">{t('printing')}</h3>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div>
                                <span className="text-xs font-black text-slate-800 dark:text-slate-200 block">{t('auto_print')}</span>
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Auto-print receipt after update</span>
                              </div>
                              <button 
                                onClick={() => setAutoPrint(!autoPrint)}
                                className={cn(
                                  "w-12 h-6 rounded-full transition-all relative flex items-center px-1",
                                  autoPrint ? "bg-indigo-600" : "bg-slate-300 dark:bg-slate-700"
                                )}
                              >
                                <div className={cn("w-4 h-4 bg-white rounded-full shadow-sm transition-all", autoPrint ? "translate-x-6" : "translate-x-0")} />
                              </button>
                            </div>
                            <div className="space-y-3">
                              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest block pr-2">{t('paper_size')}</label>
                              <div className="grid grid-cols-2 gap-2">
                                {['80mm', '58mm'].map(size => (
                                  <button 
                                    key={size}
                                    onClick={() => setPaperSize(size)}
                                    className={cn(
                                      "p-4 rounded-2xl border-2 font-black text-sm transition-all",
                                      paperSize === size ? "border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400" : "border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 text-slate-400"
                                    )}
                                  >
                                    {size} (Thermal)
                                  </button>
                                ))}
                              </div>
                            </div>
                          </section>
                        )}
 
                        {settingsSubTab === 'categories' && (
                          <section className="bg-white dark:bg-slate-900 p-6 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center shadow-inner">
                                   <ListTree size={20} />
                                 </div>
                                 <h3 className="text-base font-black text-slate-900 dark:text-white">{t('categories')}</h3>
                               </div>
                               <button 
                                 onClick={() => {
                                   const newId = `cat_${Date.now()}`;
                                   setCategories([...categories, { id: newId, label: t('new_category'), icon: 'Layers', isExpanded: true, items: [] }]);
                                 }}
                                 className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-xl font-bold text-[11px] shadow-lg shadow-blue-100 dark:shadow-none hover:bg-blue-700 dark:hover:bg-blue-600 transition-all active:scale-95 flex items-center gap-2"
                               >
                                 <Plus size={16} />
                                 {t('add')}
                               </button>
                             </div>
 
                             <div className="grid grid-cols-1 gap-3">
                               {categories.map((cat, idx) => (
                                 <div key={cat.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[24px] border border-slate-100 dark:border-slate-800">
                                   <div className="flex items-center justify-between gap-4">
                                     <div className="flex items-center gap-3 flex-1">
                                       <div className="flex flex-col gap-0.5">
                                         <button 
                                           disabled={idx === 0}
                                           onClick={() => {
                                             const newCats = [...categories];
                                             [newCats[idx], newCats[idx - 1]] = [newCats[idx - 1], newCats[idx]];
                                             setCategories(newCats);
                                           }}
                                           className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 disabled:opacity-20"
                                         >
                                           <ChevronUp size={14} />
                                         </button>
                                         <button 
                                           disabled={idx === categories.length - 1}
                                           onClick={() => {
                                             const newCats = [...categories];
                                             [newCats[idx], newCats[idx + 1]] = [newCats[idx + 1], newCats[idx]];
                                             setCategories(newCats);
                                           }}
                                           className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded-md text-slate-400 disabled:opacity-20"
                                         >
                                           <ChevronDown size={14} />
                                         </button>
                                       </div>
                                       <div className="w-10 h-10 bg-white dark:bg-slate-900 rounded-xl flex items-center justify-center shadow-sm">
                                         {cat.icon === 'Zap' ? <Zap size={18} className="text-blue-500" /> : cat.icon === 'Armchair' ? <Armchair size={18} className="text-amber-500" /> : <Layers size={18} className="text-red-500" />}
                                       </div>
                                       <input 
                                         type="text" 
                                         value={cat.label}
                                         onChange={(e) => {
                                           const newCats = [...categories];
                                           newCats[idx].label = e.target.value;
                                           setCategories(newCats);
                                         }}
                                         className="bg-transparent text-sm font-black text-slate-900 dark:text-white border-none outline-none focus:ring-0 w-full"
                                       />
                                     </div>
                                     <div className="flex items-center gap-1.5">
                                       <button 
                                         onClick={() => {
                                           const newCats = [...categories];
                                           const subLabel = prompt(t('new_sub_cat'));
                                           if (subLabel) {
                                             newCats[idx].items.push({ id: `sub_${Date.now()}`, label: subLabel });
                                             setCategories(newCats);
                                           }
                                         }}
                                         className="w-8 h-8 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg flex items-center justify-center hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-sm"
                                       >
                                         <Plus size={16} />
                                       </button>
                                       <button 
                                         onClick={() => {
                                           if (confirm(t('confirm_delete_cat'))) {
                                             setCategories(categories.filter(c => c.id !== cat.id));
                                           }
                                         }}
                                         className="w-8 h-8 bg-white dark:bg-slate-900 text-red-500 rounded-lg flex items-center justify-center hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                       >
                                         <Trash2 size={16} />
                                       </button>
                                     </div>
                                   </div>
                                   <div className="mt-3 flex flex-wrap gap-1.5 pr-12">
                                     {cat.items.map((sub) => (
                                       <div key={sub.id} className="px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-2 shadow-sm hover:border-blue-300 dark:hover:border-blue-600 transition-all">
                                         {sub.label}
                                         <button 
                                           onClick={() => {
                                             const newCats = [...categories];
                                             newCats[idx].items = newCats[idx].items.filter(i => i.id !== sub.id);
                                             setCategories(newCats);
                                           }}
                                           className="text-slate-300 dark:text-slate-600 hover:text-red-500"
                                         >
                                           <X size={12} />
                                         </button>
                                       </div>
                                     ))}
                                   </div>
                                 </div>
                               ))}
                             </div>
                          </section>
                        )}
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <CategoryDetail 
                    type={activeTab} 
                    categories={categories} 
                    t={t} 
                    userData={userData}
                    spareParts={spareParts}
                  />
                )}
              </AnimatePresence>
            </div>
            <footer className="mt-20 py-10 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Kurdish OS v1.0.0 Online</p>
              </div>
              <div className="flex items-center gap-6">
                <span className="text-[10px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors uppercase tracking-widest">تایبەتمەندی</span>
                <span className="text-[10px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors uppercase tracking-widest">پشتیوانی یارمەتی</span>
              </div>
            </footer>
          </main>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6 md:p-10">
          <motion.div
            key="auth"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
            className="w-full"
          >
            <CreateStore />
          </motion.div>
        </div>
      )}

      {/* Notification Sidebar (Left Side) */}
      <AnimatePresence>
        {isNotifSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotifSidebarOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-full max-w-[380px] bg-white dark:bg-slate-950 z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-xl flex items-center justify-center">
                       <Bell size={20} />
                    </div>
                    <div>
                       <h3 className="font-black text-slate-900 dark:text-white">ئاگادارکردنەوەکان</h3>
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{lowStockProducts.length} کاڵای کەمبووەوە</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => setIsNotifSidebarOpen(false)}
                   className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-slate-400"
                 >
                   <X size={20} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {lowStockProducts.length > 0 ? (
                  lowStockProducts.map((p) => (
                    <div key={p.id} className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] flex items-center gap-4 group hover:border-amber-200 transition-all">
                       <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-2xl shadow-sm">
                          {p.icon || '📦'}
                       </div>
                       <div className="flex-1">
                          <p className="text-sm font-black text-slate-900 dark:text-white mb-0.5">{p.name}</p>
                          <div className="flex items-center justify-between">
                             <div className="flex items-center gap-1.5">
                                <div className="h-1.5 w-12 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                   <div className="h-full bg-amber-500" style={{ width: `${Math.min((p.stock/p.threshold)*100, 100)}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-amber-600">{p.stock} ماوە</span>
                             </div>
                             <span className="text-[9px] text-slate-400 font-bold uppercase">ئاست: {p.threshold}</span>
                          </div>
                       </div>
                    </div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 py-20">
                     <Check size={48} strokeWidth={1} className="mb-4 text-emerald-500/20" />
                     <p className="text-sm font-black uppercase tracking-widest text-slate-400">هەموو کاڵاکان تەواون</p>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-slate-100 dark:border-slate-800">
                 <button className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-black text-sm active:scale-95 transition-transform">
                    بینینی هەموو ڕاپۆرتەکان
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Broken Items Modal */}
      <AnimatePresence>
        {showBrokenForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-lg font-black text-slate-900 dark:text-white">تۆمارکردنی شکان</h3>
                 <button onClick={() => setShowBrokenForm(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20}/></button>
              </div>
              <form className="p-6 space-y-4" onSubmit={async (e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const productId = formData.get('productId') as string;
                 const quantity = parseInt(String(formData.get('quantity')));
                 const product = allProducts.find(p => String(p.id) === productId);
                 
                 if (!product) {
                    alert('کاڵاکە نەدۆزرایەوە');
                    return;
                 }

                 if ((product.stock || 0) < quantity) {
                    alert(`بڕی پێویست لە کۆگا نییە! بڕی بەردەست تەنها ${product.stock || 0} دانەیە.`);
                    return;
                 }

                 try {
                   setLoading(true);
                   const newItem = {
                     productId: productId,
                     name: product.name,
                     icon: product.icon || '📦',
                     quantity: quantity,
                     date: new Date().toLocaleDateString('ku-IQ'),
                     storeId: userData.storeId,
                     createdAt: serverTimestamp()
                   };
                   
                   await addDoc(collection(db, 'stores', userData.storeId, 'brokenItems'), newItem);
                   const productRef = doc(db, 'stores', userData.storeId, 'products', String(product.id));
                   await updateDoc(productRef, {
                      stock: (product.stock || 0) - quantity,
                      updatedAt: serverTimestamp()
                   });
                   await addDoc(collection(db, 'stores', userData.storeId, 'movements'), {
                     type: 'broken',
                     productId: productId,
                     productName: product.name,
                     amount: quantity,
                     price: 0,
                     currency: 'IQD',
                     userName: userData.name || 'User',
                     storeId: userData.storeId,
                     createdAt: serverTimestamp()
                   });
                   setShowBrokenForm(false);
                 } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'brokenItems');
                 } finally {
                    setLoading(false);
                 }
               }}>
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pr-1">کاڵا هەڵبژێرە</label>
                   <select 
                     required 
                     name="productId" 
                     className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold appearance-none cursor-pointer"
                   >
                     <option value="">هەڵبژاردنی کاڵا...</option>
                     {allProducts.map(p => (
                       <option key={p.id} value={p.id}>{p.name} ({p.stock} {p.unit})</option>
                     ))}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-400 uppercase tracking-widest pr-1">بڕی شکاو</label>
                   <input required name="quantity" type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-red-500 font-bold" />
                </div>
                <button type="submit" className="w-full py-4 bg-red-500 text-white rounded-2xl font-black shadow-lg shadow-red-200 mt-4 active:scale-95 transition-all">تۆمارکردن</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Spare Parts Modal */}
      <AnimatePresence>
        {showSpareForm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl border border-slate-100 dark:border-slate-800"
            >
              <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                 <h3 className="text-lg font-black text-slate-900 dark:text-white">تۆمارکردنی یەدەگ</h3>
                 <button onClick={() => setShowSpareForm(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20}/></button>
              </div>
              <form className="p-6 space-y-4" onSubmit={async (e) => {
                 e.preventDefault();
                 const formData = new FormData(e.currentTarget);
                 const productId = formData.get('productId') as string;
                 const quantity = parseInt(String(formData.get('quantity')));
                 const product = allProducts.find(p => String(p.id) === productId);

                 if (!product) {
                    alert('کاڵاکە نەدۆزرایەوە');
                    return;
                 }

                 if ((product.stock || 0) < quantity) {
                    alert(`بڕی پێویست لە کۆگا نییە! بڕی بەردەست تەنها ${product.stock || 0} دانەیە.`);
                    return;
                 }

                 try {
                   setLoading(true);
                   const newItem = {
                     productId: productId,
                     name: product.name,
                     icon: product.icon || '📦',
                     quantity: quantity,
                     description: formData.get('desc') as string,
                     imageUrl: sparePhoto || null,
                     storeId: userData.storeId,
                     createdAt: serverTimestamp()
                   };
                   
                   await addDoc(collection(db, 'stores', userData.storeId, 'spareParts'), newItem);
                   const productRef = doc(db, 'stores', userData.storeId, 'products', String(product.id));
                   await updateDoc(productRef, {
                      stock: (product.stock || 0) - quantity,
                      updatedAt: serverTimestamp()
                   });
                   await addDoc(collection(db, 'stores', userData.storeId, 'movements'), {
                     type: 'spare_part',
                     productId: productId,
                     productName: product.name,
                     amount: quantity,
                     price: 0,
                     currency: 'IQD',
                     userName: userData.name || 'User',
                     storeId: userData.storeId,
                     createdAt: serverTimestamp()
                   });
                   setShowSpareForm(false);
                   setSparePhoto(null);
                 } catch (err) {
                    handleFirestoreError(err, OperationType.WRITE, 'spareParts');
                 } finally {
                    setLoading(false);
                 }
               }}>
                <div className="space-y-4">
                   <div 
                     className="w-full aspect-video bg-slate-100 dark:bg-slate-800 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden relative group"
                   >
                     {sparePhoto ? (
                       <div className="w-full h-full relative">
                          <img src={sparePhoto} alt="Captured" className="w-full h-full object-cover" />
                          <button 
                            type="button" 
                            onClick={() => setSparePhoto(null)}
                            className="absolute top-2 left-2 w-8 h-8 bg-red-500 text-white rounded-lg flex items-center justify-center shadow-lg active:scale-90 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                       </div>
                     ) : isCameraOpen ? (
                       <div className="w-full h-full relative">
                          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4 px-4">
                            <button 
                              type="button" 
                              onClick={capturePhoto}
                              className="w-12 h-12 bg-white rounded-full border-4 border-slate-200 flex items-center justify-center shadow-xl active:scale-90 transition-all z-10"
                            >
                               <Camera size={24} className="text-slate-900" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => {
                                if (videoRef.current?.srcObject) {
                                  const stream = videoRef.current.srcObject as MediaStream;
                                  stream.getTracks().forEach(track => track.stop());
                                }
                                setIsCameraOpen(false);
                              }}
                              className="w-12 h-12 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl active:scale-90 transition-all z-10"
                            >
                               <X size={24} />
                            </button>
                          </div>
                       </div>
                     ) : (
                       <div className="w-full h-full flex items-center justify-center gap-6">
                         <button 
                           type="button" 
                           onClick={startCamera}
                           className="flex flex-col items-center justify-center text-slate-400 gap-2 hover:text-blue-500 transition-colors"
                         >
                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
                               <Camera size={28} />
                            </div>
                            <span className="text-[10px] font-black uppercase">وێنەگرتن</span>
                         </button>

                         <div className="w-px h-12 bg-slate-200 dark:bg-slate-700" />

                         <label className="flex flex-col items-center justify-center text-slate-400 gap-2 hover:text-blue-500 transition-colors cursor-pointer">
                            <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
                               <Upload size={28} />
                            </div>
                            <span className="text-[10px] font-black uppercase">دیاریکردن</span>
                            <input 
                              type="file" 
                              accept="image/*" 
                              className="hidden" 
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  const reader = new FileReader();
                                  reader.onloadend = () => {
                                    setSparePhoto(reader.result as string);
                                  };
                                  reader.readAsDataURL(file);
                                }
                              }} 
                            />
                         </label>
                       </div>
                     )}
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest pr-1">کاڵا هەڵبژێرە</label>
                         <select 
                           required 
                           name="productId" 
                           className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold appearance-none cursor-pointer"
                         >
                           <option value="">هەڵبژاردنی کاڵا...</option>
                           {allProducts.map(p => (
                             <option key={p.id} value={p.id}>{p.name}</option>
                           ))}
                         </select>
                      </div>
                      <div className="space-y-2">
                         <label className="text-xs font-black text-slate-400 uppercase tracking-widest pr-1">بڕ</label>
                         <input required name="quantity" type="number" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                      </div>
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-black text-slate-400 uppercase tracking-widest pr-1">وەسف (تێبینی)</label>
                      <input name="desc" className="w-full p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold" />
                   </div>
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-100 mt-4 active:scale-95 transition-all">پاشەکەوتکردن</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedImage && (
          <div 
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xl"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl w-full aspect-square md:aspect-auto md:max-h-[85vh] rounded-[32px] overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img src={selectedImage} alt="Preview" className="w-full h-full object-contain bg-slate-900" />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white rounded-full flex items-center justify-center transition-colors"
              >
                <X size={24} />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}


function ExchangeRateCard() {
  const [rate, setRate] = useState<string>('...');
  const [loading, setLoading] = useState(true);

  const fetchRate = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch('/api/exchange-rate', { signal: controller.signal });
      clearTimeout(timeoutId);
      
      if (!res.ok) throw new Error('Network response was not ok');
      
      const data = await res.json();
      if (data.usd) {
        setRate(data.usd);
      }
    } catch (err: any) {
      console.warn('Failed to fetch rate, using local value:', err.message);
      // Ensure we have a value even if the network fails
      setRate('١٥٣,٢٥٠');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    const interval = setInterval(fetchRate, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-[28px] p-4 flex items-center justify-between shadow-sm hover:border-slate-400 group transition-all duration-300 relative overflow-hidden">
      {/* Glow Effect */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full blur-3xl -mr-12 -mt-12 transition-opacity group-hover:opacity-100 opacity-50"></div>
      
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-11 h-11 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-100 transition-transform group-hover:scale-105">
          <DollarSign size={22} strokeWidth={2.5} />
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1.5">
            <span>١٠٠ دۆلار</span>
            <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
            <span>فرۆشتن</span>
          </p>
          <div className="flex items-center gap-2 leading-none">
            {loading && rate === '...' ? (
              <div className="w-16 h-5 bg-slate-100 rounded animate-pulse" />
            ) : (
              <span className="text-xl font-bold text-slate-900 tracking-tight drop-shadow-sm">{rate}</span>
            )}
            <div className={`w-1.5 h-1.5 rounded-full ${loading ? 'bg-slate-300' : 'bg-emerald-500'} animate-pulse`}></div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 relative z-10">
        <div className="text-left hidden xs:block">
          <p className="text-[8px] font-black text-slate-300 uppercase leading-none mb-1">Live Feed</p>
          <p className="text-[10px] font-black text-slate-900/40 leading-none">قمر الفجر</p>
        </div>
        <a 
          href="https://qamaralfajr.com/production/exchange_rates.php" 
          target="_blank" 
          rel="noreferrer"
          className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm group/btn"
        >
          <ArrowRight size={18} className="-rotate-45 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5" />
        </a>
      </div>
    </div>
  );
}

function StockAdjuster({ stock, threshold, onUpdate }: { stock: number, threshold: number, onUpdate: (val: number) => void }) {
  const [plusState, setPlusState] = useState<'idle' | 'confirm'>('idle');
  const [minusState, setMinusState] = useState<'idle' | 'confirm'>('idle');
 
  const handlePlus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (plusState === 'idle') {
      setPlusState('confirm');
      setMinusState('idle'); // reset other
      setTimeout(() => setPlusState('idle'), 2000);
    } else {
      onUpdate(stock + 1);
      setPlusState('idle');
    }
  };
 
  const handleMinus = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (minusState === 'idle') {
      setMinusState('confirm');
      setPlusState('idle'); // reset other
      setTimeout(() => setMinusState('idle'), 2000);
    } else {
      if (stock > 0) onUpdate(stock - 1);
      setMinusState('idle');
    }
  };
 
  const isLow = stock <= threshold;
 
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl p-1 shadow-sm relative transition-colors">
      {isLow && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white dark:border-slate-900 z-10" 
        />
      )}
      <motion.button 
        onClick={handleMinus}
        whileTap={{ scale: 0.9 }}
        animate={{
          backgroundColor: minusState === 'confirm' ? "#ef4444" : "var(--color-slate-900, #ffffff)", // Fallback to white if not dark
          color: minusState === 'confirm' ? "#ffffff" : "#94a3b8"
        }}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-lg transition-colors border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900"
        )}
      >
        <Minus size={14} strokeWidth={3} />
      </motion.button>
      
      <motion.button 
        onClick={handlePlus}
        whileTap={{ scale: 0.9 }}
        animate={{
          backgroundColor: plusState === 'confirm' ? "#10b981" : "var(--color-slate-900, #ffffff)",
          color: plusState === 'confirm' ? "#ffffff" : "#94a3b8"
        }}
        className={cn(
          "w-7 h-7 flex items-center justify-center rounded-lg transition-colors border border-slate-100 dark:border-slate-700 shadow-sm bg-white dark:bg-slate-900"
        )}
      >
        <Plus size={14} strokeWidth={3} />
      </motion.button>
    </div>
  );
}

interface Product {
  id: string | number;
  name: string;
  code: string;
  price: string | number;
  currency: 'IQD' | 'USD';
  unit: string;
  stock: number;
  icon: string;
  color: string;
  description: string;
  threshold: number;
  category?: string;
  imageUrl?: string;
  lastModifiedBy?: string;
  lastModifiedAt?: string;
}

function ProductModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  initialData,
  t
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: Partial<Product>) => void;
  onDelete?: (id: string | number) => void;
  initialData?: Product | null;
  t: (key: string) => string;
}) {
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    code: '',
    price: '',
    currency: 'IQD',
    unit: 'هەر پاکەتێک',
    stock: 0,
    description: '',
    icon: '📦',
    color: '#3b82f6',
    threshold: 5,
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setShowDeleteConfirm(false);
    if (initialData) {
      setFormData({
        name: initialData.name,
        code: initialData.code,
        price: initialData.price,
        currency: initialData.currency || 'IQD',
        unit: initialData.unit,
        stock: initialData.stock,
        description: initialData.description || '',
        icon: initialData.icon,
        color: initialData.color,
        threshold: initialData.threshold,
      });
    } else {
      setFormData({
        name: '',
        code: '',
        price: '',
        currency: 'IQD',
        unit: 'هەر پاکەتێک',
        stock: 0,
        description: '',
        icon: '📦',
        color: '#3b82f6',
        threshold: 5,
      });
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-white dark:text-slate-900 shadow-lg overflow-hidden relative">
              <motion.div 
                className="absolute inset-0 bg-blue-500"
                initial={false}
                animate={{ opacity: initialData ? 1 : 0 }}
              />
              <div className="relative z-10">
                <SettingsIcon size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{initialData ? t('product_settings') : t('new_product')}</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-1">
                Management Settings
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {initialData && initialData.id && onDelete && (
              <div className="flex items-center">
                <AnimatePresence mode="wait">
                  {!showDeleteConfirm ? (
                    <motion.button 
                      key="trash"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDeleteConfirm(true);
                      }}
                      className="w-10 h-10 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-xl flex items-center justify-center hover:bg-red-500 dark:hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 z-20"
                      title={t('logout')} // Borrowing logout icon title if needed or just use trash
                    >
                      <Trash2 size={20} />
                    </motion.button>
                  ) : (
                    <motion.div 
                      key="confirm"
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: 20, opacity: 0 }}
                      className="flex items-center gap-1 bg-red-50 dark:bg-red-900/30 p-1 rounded-xl border border-red-100 dark:border-red-900/50 shadow-sm"
                    >
                      <button 
                        onClick={() => onDelete(initialData.id!)}
                        className="px-3 h-8 bg-red-500 text-white text-[11px] font-black rounded-lg hover:bg-red-600 transition-all active:scale-95"
                      >
                         بەڵێ
                      </button>
                      <button 
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 h-8 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[11px] font-black rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-all active:scale-95 border border-slate-100 dark:border-slate-700"
                      >
                         نەخێر
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <button 
              onClick={() => onSave(formData)}
              className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
              title={t('save')}
            >
              <Save size={18} />
            </button>
 
            <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-800 mx-1" />
 
            <button onClick={onClose} className="w-10 h-10 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
        </div>
 
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2">{t('main_info')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                  <Type size={11} className="text-slate-400" /> {t('product_name')}
                </label>
                <input 
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 dark:focus:border-slate-600 transition-all text-sm font-bold dark:text-white" 
                  placeholder={t('product_name') + "..."}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                  <Hash size={11} className="text-slate-400" /> {t('product_code')}
                </label>
                <input 
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 dark:focus:border-slate-600 transition-all text-sm font-bold text-left dark:text-white" 
                  placeholder="E-100"
                />
              </div>
            </div>
          </div>
 
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2">{t('price_and_stock')}</h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                  <DollarSign size={11} className="text-slate-400" /> {t('price')}
                </label>
                <div className="flex gap-2">
                  <input 
                    value={formData.price}
                    inputMode="decimal"
                    onChange={(e) => {
                      const raw = e.target.value.replace(/,/g, '');
                      if (!isNaN(parseInt(normalizeDigits(raw))) || raw === '') {
                        setFormData({ ...formData, price: formatNumber(raw) });
                      }
                    }}
                    className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 dark:focus:border-slate-600 transition-all text-sm font-bold text-left dark:text-white" 
                    placeholder="000,000"
                  />
                  <div className="flex bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-1 gap-1">
                    {['IQD', 'USD'].map((curr) => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => setFormData({ ...formData, currency: curr as any })}
                        className={cn(
                          "px-3 py-1 rounded-xl text-[10px] font-black transition-all whitespace-nowrap",
                          formData.currency === curr ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-700" : "text-slate-400 hover:text-slate-600"
                        )}
                      >
                        {curr === 'IQD' ? 'د.ع' : '$'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                  <Package size={11} className="text-slate-400" /> یەکەی پێوانە
                </label>
                <input 
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 dark:focus:border-slate-600 transition-all text-sm font-bold dark:text-white" 
                  placeholder="نموونە: هەر کارتۆنێک"
                />
              </div>
 
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                    <Package2 size={11} className="text-slate-400" /> {t('stock')}
                  </label>
                  <input 
                    type="number"
                    inputMode="numeric"
                    value={formData.stock || ''}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 dark:focus:border-slate-600 transition-all text-sm font-bold dark:text-white" 
                    placeholder="0"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-orange-400" /> {t('low_stock_alert')}
                  </label>
                  <input 
                    type="number"
                    value={formData.threshold}
                    onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50 rounded-2xl outline-none focus:ring-4 focus:ring-red-500/5 focus:border-red-200 dark:focus:border-red-600 transition-all text-sm font-bold text-red-500 dark:text-red-400" 
                  />
                </div>
              </div>
            </div>
          </div>
 
          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2">{t('style')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                  <Palette size={11} className="text-slate-400" /> {t('color')}
                </label>
                <div className="relative group">
                  <input 
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10" 
                  />
                  <div className="flex items-center gap-3 px-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all">
                    <div className="w-7 h-7 rounded-lg border border-white dark:border-slate-700 shadow-sm" style={{ backgroundColor: formData.color }} />
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{formData.color}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ProductDetailsModal({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData,
  t,
  spareParts
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: Partial<Product>) => void;
  initialData: Product;
  t: (key: string) => string;
  spareParts: any[];
}) {
  const [formData, setFormData] = useState<Partial<Product>>({
    description: '',
    imageUrl: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData({
        description: initialData.description || '',
        imageUrl: initialData.imageUrl || '',
      });
    }
  }, [initialData, isOpen]);

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800"
      >
        <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white shadow-lg">
              <Info size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{t('product_info_image')}</h3>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">
                {initialData.name} - {initialData.code}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onSave(formData)}
              className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center hover:bg-emerald-500 dark:hover:bg-emerald-600 hover:text-white transition-all shadow-sm active:scale-90"
              title={t('save')}
            >
              <Save size={18} />
            </button>
 
            <div className="w-[1px] h-6 bg-slate-100 dark:bg-slate-800 mx-1" />
 
            <button onClick={onClose} className="w-10 h-10 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center">
              <X size={20} />
            </button>
          </div>
        </div>
 
        <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
          <div className="space-y-3">
             <h4 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2">{t('product_image_desc')}</h4>
             {/* Associated Spare Parts */}
             {spareParts.filter(sp => String(sp.productId) === String(initialData.id)).length > 0 && (
               <div className="mb-4 space-y-2">
                 <div className="flex items-center justify-between px-2">
                   <h5 className="text-[9px] font-black text-blue-500 uppercase tracking-widest">یەدەگە پەیوەندیدارەکان</h5>
                 </div>
                 <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                   {spareParts.filter(sp => String(sp.productId) === String(initialData.id)).map((sp, i) => (
                     <div key={i} className="min-w-[120px] p-2 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 shrink-0">
                       <div className="w-full aspect-square bg-white dark:bg-slate-900 rounded-xl overflow-hidden mb-2">
                         {sp.imageUrl ? <img src={sp.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-slate-200"><Package size={20} /></div>}
                       </div>
                       <p className="text-[10px] font-black text-slate-900 dark:text-white truncate">{sp.name}</p>
                       <p className="text-[9px] text-blue-600 font-bold">بڕ: {sp.quantity}</p>
                     </div>
                   ))}
                 </div>
               </div>
             )}
             <div className="flex flex-col items-center gap-4">
                <div className="w-full h-56 bg-white dark:bg-slate-800/50 rounded-[24px] border-2 border-dashed border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden relative group shadow-inner">
                  {formData.imageUrl ? (
                    <>
                      <img src={formData.imageUrl} alt="Product" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                         <button 
                           onClick={() => fileInputRef.current?.click()}
                           className="p-3 bg-white text-slate-900 rounded-2xl hover:scale-110 transition-transform shadow-xl"
                         >
                            <Camera size={20} />
                         </button>
                         <button 
                           onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                           className="p-3 bg-red-500 text-white rounded-2xl hover:scale-110 transition-transform shadow-xl"
                         >
                            <Trash2 size={20} />
                         </button>
                      </div>
                    </>
                  ) : (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center gap-3 text-slate-300 dark:text-slate-700 hover:text-blue-500 transition-colors"
                    >
                      <div className="w-14 h-14 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center shadow-sm">
                        <ImageIcon size={32} strokeWidth={1.5} />
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest leading-none mb-1">Upload Photo</span>
                        <div className="flex items-center gap-1 text-[8px] font-bold opacity-60">
                           <Camera size={10} />
                           {t('capture_photo')}
                        </div>
                      </div>
                    </button>
                  )}
                  <input 
                    type="file"
                    ref={fileInputRef}
                    onChange={handleCapturePhoto}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
             </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest px-2">{t('product_description')}</h4>
            <div className="space-y-1">
              <label className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 mr-2 flex items-center gap-1.5">
                <FileText size={11} className="text-slate-400" /> {t('notes_description')}
              </label>
              <textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none focus:ring-4 focus:ring-slate-900/5 focus:border-slate-300 dark:focus:border-slate-600 transition-all text-sm font-bold dark:text-white min-h-[120px] resize-none" 
                placeholder="تێبینی و زانیاری زیاتر لەسەر ئەم کاڵایە لێرە بنوسە..."
              />
            </div>
          </div>
        </div>
        </motion.div>
      </div>
    );
  }

function StatsView({ movements, products, exchangeRate, t }: { movements: any[], products: Product[], exchangeRate: string, t: (k: string) => string }) {
  const currentRate = parseInt(exchangeRate.replace(/,/g, '')) || 152000;
  const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');

  const getPriceInIQD = (price: any, currency: string) => {
    const p = parseFloat(String(price).replace(/,/g, '')) || 0;
    return currency === 'USD' ? p * (currentRate / 100) : p;
  };

  // Current total inventory value
  const totalInventoryValue = products.reduce((acc, p) => {
    return acc + (p.stock || 0) * getPriceInIQD(p.price, p.currency || 'IQD');
  }, 0);

  const filteredMovements = movements.filter(m => {
    const date = (m.createdAt as any)?.toDate();
    if (!date) return false;
    const now = new Date();
    if (period === 'weekly') {
      const weekAgo = new Date();
      weekAgo.setDate(now.getDate() - 7);
      return date >= weekAgo;
    } else if (period === 'monthly') {
      const monthAgo = new Date();
      monthAgo.setMonth(now.getMonth() - 1);
      return date >= monthAgo;
    } else {
      const yearAgo = new Date();
      yearAgo.setFullYear(now.getFullYear() - 1);
      return date >= yearAgo;
    }
  });

  // Yearly Comparison Data (Inventory Movements Value)
  const getYearlyData = () => {
    const now = new Date();
    const years = [now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2];
    
    return years.map(year => {
      const yearVolume = movements
        .filter(m => m.createdAt?.toDate().getFullYear() === year)
        .reduce((acc, m) => acc + (m.amount || 0) * getPriceInIQD(m.price, m.currency), 0);
      
      return {
        year: year.toString(),
        total: yearVolume
      };
    }).reverse();
  };

  const yearlyComparison = getYearlyData();

  // Monthly breakdown for the current year
  const getMonthlyBreakdown = () => {
    const now = new Date();
    const months = Array.from({ length: 12 }, (_, i) => i);
    return months.map(mIdx => {
      const monthVolume = movements
        .filter(m => {
          const d = m.createdAt?.toDate();
          return d?.getFullYear() === now.getFullYear() && d?.getMonth() === mIdx;
        })
        .reduce((acc, m) => acc + (m.amount || 0) * getPriceInIQD(m.price, m.currency), 0);
      
      return {
        name: new Intl.DateTimeFormat('ku', { month: 'short' }).format(new Date(now.getFullYear(), mIdx)),
        total: monthVolume
      };
    });
  };

  const monthlyData = getMonthlyBreakdown();

  return (
    <div className="space-y-6">
      {/* Top Banner - Total Inventory Value */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-slate-900 rounded-[28px] p-5 text-white flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl animate-pulse"></div>
        <div className="relative z-10">
           <h3 className="text-lg font-black mb-1">کۆی نرخ</h3>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">بەپێی بڕی هه‌یه‌ و نرخی دابینکراو</p>
        </div>
        <div className="relative z-10 text-center md:text-left">
           <div className="flex items-baseline gap-2 justify-center md:justify-end">
             <span className="text-3xl font-black tracking-tight">{formatNumber(totalInventoryValue)}</span>
             <span className="text-sm font-bold text-emerald-400 uppercase tracking-widest">دینار</span>
           </div>
           <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">Current Warehouse Valuation</p>
        </div>
      </motion.div>

      {/* Stats Controls */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 w-fit">
        {[
          { id: 'weekly', label: 'هەفتانە' },
          { id: 'monthly', label: 'مانگانە' },
          { id: 'yearly', label: 'ساڵانە' }
        ].map(p => (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id as any)}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black transition-all",
              period === p.id ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-900"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* YoY Comparison Chart */}
        <div className="col-span-12 lg:col-span-5 bento-card p-6 min-h-[350px] flex flex-col">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">بەراوردی قەبارەی کاڵا (٢٠٢٤ - ٢٠٢٦)</h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyComparison}>
                <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800 }} />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  formatter={(value: any) => [formatNumber(value) + " د.ع", "قەبارە"]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="total" radius={[8, 8, 0, 0]}>
                  {yearlyComparison.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 2 ? '#10b981' : index === 1 ? '#94a3b8' : '#e2e8f0'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-bold text-slate-500">ئەمساڵ</span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-slate-400" />
               <span className="text-[10px] font-bold text-slate-500">پار</span>
            </div>
          </div>
        </div>

        {/* Current Year performance */}
        <div className="col-span-12 lg:col-span-7 bento-card p-6 min-h-[350px] flex flex-col">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">جموجۆڵی مانگانەی کۆگا</h4>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="statsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800 }} />
                <Tooltip 
                  formatter={(value: any) => [formatNumber(value) + " د.ع", "قەبارە"]}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                />
                <Area type="monotone" dataKey="total" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#statsGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* List of Recent High-Value Movements */}
        <div className="col-span-12 bento-card p-6">
          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6">لیستی وردی جموجۆڵەکانی ئەم ماوەیە</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800">
                  <th className="pb-4 pr-4">کاڵا</th>
                  <th className="pb-4">جۆر</th>
                  <th className="pb-4">بەروار</th>
                  <th className="pb-4">بڕ</th>
                  <th className="pb-4">نرخی یەکە</th>
                  <th className="pb-4 pl-4 text-left">کۆی گشتی (دینار)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {filteredMovements.slice(0, 10).map((m) => (
                  <tr key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 pr-4">
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{m.productName}</p>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">{m.userName}</p>
                    </td>
                    <td className="py-4">
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight",
                        m.type === 'sale' ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                      )}>{m.type}</span>
                    </td>
                    <td className="py-4 text-[11px] font-bold text-slate-500">
                      {new Date(m.createdAt?.toDate()).toLocaleDateString('ku')}
                    </td>
                    <td className="py-4 text-[11px] font-black text-slate-900 dark:text-white">
                      {m.amount}
                    </td>
                    <td className="py-4 text-[11px] font-bold text-slate-500">
                      {formatNumber(m.price)} {m.currency}
                    </td>
                    <td className="py-4 pl-4 text-left text-sm font-black text-slate-900 dark:text-white">
                      {formatNumber((m.amount || 0) * getPriceInIQD(m.price, m.currency))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MaintenanceView({ brokenItems, spareParts, setShowBrokenForm, setShowSpareForm, setSelectedImage, userData, t }: { brokenItems: any[], spareParts: any[], setShowBrokenForm: (v: boolean) => void, setShowSpareForm: (v: boolean) => void, setSelectedImage: (img: string | null) => void, userData: any, t: (k: string) => string }) {
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, coll: string, id: string, itemStoreId: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const storeId = itemStoreId || userData?.storeId;
    console.log('Delete Attempt:', { coll, id, storeId });
    if (!storeId) return alert('هەڵە: ناسنامەی کۆگا نەدۆزرایەوە (Store ID Missing)');
    if (!id) return alert('هەڵە: ناسنامەی بڕگە نەدۆزرایەوە (Item ID Missing)');
    
    if (!window.confirm('ئایا دڵنیای لە بڕینەوەی ئەم بڕگەیە؟')) return;
    
    try {
      setProcessingId(id);
      const docRef = doc(db, 'stores', storeId, coll, id);
      await deleteDoc(docRef);
      console.log('Delete Success');
    } catch (err: any) {
      console.error('Delete Error:', err);
      alert('هەڵەیەک ڕوویدا لە کاتی سڕینەوە: ' + (err.message || 'نەزانراو'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleReturn = async (e: React.MouseEvent, coll: string, item: any, itemStoreId: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const storeId = itemStoreId || userData?.storeId;
    console.log('Return Attempt:', { coll, itemId: item?.id, storeId });
    if (!storeId) return alert('هەڵە: ناسنامەی کۆگا نەدۆزرایەوە (Store ID Missing)');
    if (!item?.id) return alert('هەڵە: ئەم بڕگەیە ناسنامەی نییە (Item ID Missing)');
    
    if (!window.confirm('ئایا دڵنیای لە گەڕاندنەوەی ئەم بڕە بۆ ناو کۆگا؟')) return;
    
    try {
      setProcessingId(item.id);
      const quantityNum = Number(item.quantity) || 0;

      await runTransaction(db, async (transaction) => {
        if (item.productId) {
          const productRef = doc(db, 'stores', storeId, 'products', String(item.productId));
          const productSnap = await transaction.get(productRef);
          if (productSnap.exists()) {
            transaction.update(productRef, {
              stock: (Number(productSnap.data().stock) || 0) + quantityNum,
              updatedAt: serverTimestamp()
            });
          }
        }

        const movementRef = doc(collection(db, 'stores', storeId, 'movements'));
        transaction.set(movementRef, {
          type: 'adjustment',
          storeId: storeId, // CRITICAL: Added missing storeId
          productId: item.productId ? String(item.productId) : 'unlinked',
          productName: item.name || 'کاڵا',
          amount: quantityNum,
          price: 0,
          currency: 'IQD',
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
          note: `گەڕاندنەوە لە ${coll === 'brokenItems' ? 'بەشی شکان' : 'یەدەگ'}`
        });

        transaction.delete(doc(db, 'stores', storeId, coll, item.id));
      });
      console.log('Return Success');
    } catch (err: any) {
      console.error('Return Error:', err);
      alert('هەڵە لە گەڕاندنەوە: ' + (err.message || 'نەزانراو'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 pb-36">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">بەڕێوەبردنی یەدەگ و شکان</h2>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Maintenance & Inventory Management</p>
        </div>
        <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowBrokenForm(true)}
             className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors"
           >
             <AlertTriangle size={16} />
             <span>تۆمارکردنی شکان</span>
           </button>
           <button 
             onClick={() => setShowSpareForm(true)}
             className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/10 text-blue-600 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors"
           >
             <Wrench size={16} />
             <span>تۆمارکردنی یەدەگ</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Broken Items Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">کاڵای شکاو</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Broken & Faulty Items</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead>
                  <tr className="border-b border-slate-50 dark:border-slate-800">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">کاڵا</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">بڕ</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">بەروار</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">کردارەکان</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {brokenItems.length > 0 ? (
                    brokenItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-lg">🛠️</div>
                            <span className="text-sm font-black text-slate-900 dark:text-white">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 text-[11px] font-black rounded-lg">
                            {item.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {item.date}
                        </td>
                         <td className="px-6 py-4">
                             <div className="flex items-center justify-end gap-2">
                               <button 
                                 type="button"
                                 disabled={processingId === item.id}
                                 onClick={(e) => handleDelete(e, 'brokenItems', item.id, item.storeId || userData?.storeId)}
                                 className="relative z-50 p-3 bg-red-100 dark:bg-red-900/40 text-red-600 rounded-2xl hover:bg-red-200 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-90"
                                 title="سڕینەوە"
                               >
                                 {processingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <Trash2 size={18} />}
                               </button>
                               <button 
                                 type="button"
                                 disabled={processingId === item.id}
                                 onClick={(e) => handleReturn(e, 'brokenItems', item, item.storeId || userData?.storeId)}
                                 className="relative z-50 p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 rounded-2xl hover:bg-emerald-200 transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-90"
                                 title="گەڕاندنەوە"
                               >
                                 {processingId === item.id ? <Loader2 size={18} className="animate-spin" /> : <RotateCcw size={18} />}
                               </button>
                             </div>
                         </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-300">
                          <AlertTriangle size={48} strokeWidth={1} className="mb-4 opacity-20" />
                          <p className="text-sm font-bold uppercase tracking-widest">هیچ شکاوێک تۆمار نەکراوە</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Spare Parts Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-2xl flex items-center justify-center">
              <Package2 size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white leading-none">بەشی یەدەگ</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Spare Parts Inventory</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {spareParts.length > 0 ? (
              spareParts.map((item) => (
                <motion.div 
                  key={item.id}
                  whileHover={{ y: -4 }}
                  className="bg-white dark:bg-slate-900 p-4 rounded-[28px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col gap-4 group relative"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      onClick={() => item.imageUrl && setSelectedImage(item.imageUrl)}
                      className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-[20px] overflow-hidden shadow-inner shrink-0 relative cursor-zoom-in"
                    >
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Wrench size={24} />
                        </div>
                      )}
                      <div className="absolute top-1 right-1 w-6 h-6 bg-blue-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center shadow-lg">
                        {item.quantity}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-slate-900 dark:text-white line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-0.5 line-clamp-1">{item.description || 'بەشی یەدەگی کاتی'}</p>
                      <div className="flex items-center gap-1.5 mt-2">
                         <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                         <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">لەبەردەستە</span>
                      </div>
                    </div>
                  </div>
                  
                   <div className="flex items-center gap-2 pt-3 border-t border-slate-50 dark:border-slate-800">
                     <button 
                       type="button"
                       disabled={processingId === item.id}
                       onClick={(e) => handleDelete(e, 'spareParts', item.id, item.storeId || userData?.storeId)}
                       className="flex-1 relative z-50 flex items-center justify-center gap-2 py-3 px-4 bg-red-100 dark:bg-red-900/40 text-[11px] font-black text-red-600 rounded-2xl hover:bg-red-200 transition-all disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm"
                     >
                       {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                       <span>سڕینەوە</span>
                     </button>
                     <button 
                       type="button"
                       disabled={processingId === item.id}
                       onClick={(e) => handleReturn(e, 'spareParts', item, item.storeId || userData?.storeId)}
                       className="flex-1 relative z-50 flex items-center justify-center gap-2 py-3 px-4 bg-emerald-100 dark:bg-emerald-900/40 text-[11px] font-black text-emerald-600 rounded-2xl hover:bg-emerald-200 transition-all disabled:opacity-50 cursor-pointer active:scale-95 shadow-sm"
                     >
                       {processingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                       <span>گەڕاندنەوە</span>
                     </button>
                   </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] p-12 text-center text-slate-300 dark:text-slate-700">
                <Archive size={48} strokeWidth={1} className="mx-auto mb-4 opacity-20" />
                <p className="text-sm font-bold uppercase tracking-widest">کۆگای یەدەگ بەتاڵە</p>
                <button 
                  onClick={() => setShowSpareForm(true)}
                  className="mt-4 px-6 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest"
                >
                  زیادکردنی یەدەگ
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function CategoryDetail({ type, categories, t, userData, spareParts }: { type: string, categories: any[], t: (key: string) => string, userData: any, spareParts: any[] }) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Product | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedItemForDetails, setSelectedItemForDetails] = useState<Product | null>(null);

  const getTypeInfo = (type: string) => {
    if (type === 'all_stores') return { label: t('all_stores'), color: 'bg-slate-900' };
    
    for (let c of categories) {
      const sub = c.items.find((i: any) => i.id === type);
      if (sub) {
        const colors = ['bg-blue-500', 'bg-amber-500', 'bg-red-500', 'bg-emerald-500', 'bg-indigo-500'];
        const catIndex = categories.indexOf(c);
        return { 
          label: sub.label, 
          color: colors[catIndex % colors.length]
        };
      }
    }
    return { label: type, color: 'bg-slate-500' };
  };
  
  const typeInfo = getTypeInfo(type);
 
  useEffect(() => {
    if (!userData?.storeId) return;
    
    setLoading(true);
    const productsRef = collection(db, 'stores', userData.storeId, 'products');
    let q = query(productsRef);
    
    if (type !== 'all_stores') {
      q = query(productsRef, where('category', '==', type));
    }

    const unsub = onSnapshot(q, (snap) => {
      const prods = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setItems(prods);
      setLoading(false);
    }, (err) => {
      console.error("Products listen error:", err);
      setLoading(false);
    });

    return () => unsub();
  }, [type, userData?.storeId]);
 
  const updateStock = async (item: Product, newStock: number | string) => {
    if (!userData?.storeId) return;
    const nStock = typeof newStock === 'string' ? parseInt(newStock) : newStock;

    const diff = nStock - item.stock;
    if (diff === 0) return;

    try {
      const productRef = doc(db, 'stores', userData.storeId, 'products', String(item.id));
      await updateDoc(productRef, {
        stock: nStock,
        updatedAt: serverTimestamp()
      });

      // Record movement
      await addDoc(collection(db, 'stores', userData.storeId, 'movements'), {
        type: diff < 0 ? 'sale' : 'stock_in',
        productId: String(item.id),
        productName: item.name,
        amount: Math.abs(diff),
        price: parseFloat(String(item.price).replace(/,/g, '')) || 0,
        currency: item.currency || 'IQD',
        userName: userData.name || 'User',
        storeId: userData.storeId,
        createdAt: serverTimestamp()
      });
    } catch (e) {
      console.error("Error updating stock/movement:", e);
    }
  };
 
  const handleSaveProduct = async (data: Partial<Product>) => {
    if (!userData?.storeId) return;
    const storeId = userData.storeId;

    // Convert price string to number if it's a string
    const processedData = { ...data };
    if (typeof data.price === 'string') {
      processedData.price = parseFloat(String(data.price).replace(/,/g, '')) || 0;
    }

    try {
       if (selectedItem) {
          const productRef = doc(db, 'stores', storeId, 'products', String(selectedItem.id));
          const oldProduct = selectedItem as any;
          const newStock = processedData.stock ?? oldProduct.stock;
          const stockDiff = newStock - oldProduct.stock;

          await updateDoc(productRef, {
            ...processedData,
            updatedAt: serverTimestamp()
          });

          if (stockDiff !== 0) {
             const movementPath = `stores/${storeId}/movements`;
             try {
               await addDoc(collection(db, 'stores', storeId, 'movements'), {
                 type: stockDiff < 0 ? 'sale' : 'stock_in',
                 productId: String(selectedItem.id),
                 productName: processedData.name || oldProduct.name,
                 amount: Math.abs(stockDiff),
                 price: processedData.price || 0,
                 currency: processedData.currency || oldProduct.currency || 'IQD',
                 userName: userData.name || 'User',
                 storeId: storeId,
                 createdAt: serverTimestamp()
               });
             } catch (movErr) {
               handleFirestoreError(movErr, OperationType.WRITE, movementPath);
             }
          }
       } else {
          // Creating new product
          const productsRef = collection(db, 'stores', storeId, 'products');
          const finalData = {
            ...processedData,
            category: type !== 'all_stores' ? type : (processedData.category || 'general'),
            storeId: storeId,
            createdAt: serverTimestamp()
          };
          const productPath = `stores/${storeId}/products`;
          let newDoc;
          try {
            newDoc = await addDoc(productsRef, finalData);
          } catch (prodErr) {
            handleFirestoreError(prodErr, OperationType.WRITE, productPath);
            return;
          }

          // Record initial stock if > 0
          if (processedData.stock && processedData.stock > 0) {
             const movementPath = `stores/${storeId}/movements`;
             try {
               await addDoc(collection(db, 'stores', storeId, 'movements'), {
                 type: 'stock_in',
                 productId: newDoc.id,
                 productName: processedData.name,
                 amount: processedData.stock,
                 price: processedData.price || 0,
                 currency: processedData.currency || 'IQD',
                 userName: userData.name || 'User',
                 storeId: storeId,
                 createdAt: serverTimestamp()
               });
             } catch (movErr) {
               handleFirestoreError(movErr, OperationType.WRITE, movementPath);
             }
          }
       }
       setIsModalOpen(false);
    } catch (e) {
       console.error("Error saving product:", e);
    }
  };

  const handleSaveDetails = async (data: Partial<Product>) => {
    if (selectedItemForDetails && userData?.storeId) {
      try {
        const productRef = doc(db, 'stores', userData.storeId, 'products', String(selectedItemForDetails.id));
        await updateDoc(productRef, {
          description: data.description,
          imageUrl: data.imageUrl,
          updatedAt: serverTimestamp()
        });
      } catch (e) {
        console.error("Error saving details:", e);
      }
    }
    setIsDetailsModalOpen(false);
  };
 
  const handleDeleteProduct = async (id: string | number) => {
    if (!userData?.storeId) return;
    try {
      await deleteDoc(doc(db, 'stores', userData.storeId, 'products', String(id)));
    } catch (e) {
      console.error("Error deleting product:", e);
    }
    setIsModalOpen(false);
  };
 
  const handleEdit = (item: Product) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };
 
  const handleViewDetails = (item: Product) => {
    setSelectedItemForDetails(item);
    setIsDetailsModalOpen(true);
  };
 
  const handleAddNew = () => {
    setSelectedItem(null);
    setIsModalOpen(true);
  };
 
  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-slate-300">
        <Loader2 size={40} className="animate-spin mb-4" />
        <p className="text-xs font-black uppercase tracking-widest">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[28px] p-4 shadow-sm transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 dark:bg-white rounded-xl flex items-center justify-center text-xl shadow-xl shadow-slate-100 dark:shadow-none italic">
            <div className={cn(
              "w-3 h-3 rounded-full animate-pulse",
              typeInfo.color
            )} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-tight">{t('inventory_list')} {typeInfo.label}</h3>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">
              Inventory & Warehouse
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleAddNew}
            className="w-10 h-10 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center justify-center text-slate-900 dark:text-white hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 transition-all shadow-sm group"
          >
            <Plus size={20} className="transition-transform group-hover:rotate-90" />
          </button>
        </div>
      </div>
 
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {items.map((item) => (
          <motion.div 
            key={item.id}
            whileHover={{ y: -2 }}
            className={cn(
              "bg-white dark:bg-slate-900 border flex flex-col justify-between rounded-[20px] p-4 shadow-sm hover:border-slate-400 dark:hover:border-slate-600 transition-all duration-300 relative overflow-hidden group min-h-[140px]",
              item.stock <= item.threshold ? "border-red-100 dark:border-red-900/50 bg-red-50/10 dark:bg-red-900/5" : "border-slate-200 dark:border-slate-800"
            )}
          >
            {item.stock <= item.threshold && (
              <div className="absolute top-0 right-0 left-0 h-1 bg-red-500/20 shadow-[inset_0_0_10px_rgba(239,68,68,0.2)]" />
            )}
  
            <div className="flex items-start justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <h4 className="text-[12.5px] font-bold text-slate-900 dark:text-white tracking-tight leading-none">{item.name}</h4>
              </div>
              <div className={cn(
                "px-2 py-0.5 rounded-lg text-[9px] font-black tracking-tight shadow-sm border",
                item.stock > item.threshold 
                  ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-800" 
                  : "bg-red-500 text-white border-red-400 shadow-md shadow-red-100 dark:shadow-none"
              )}>
                {item.stock}
              </div>
            </div>
  
            <div className="py-1.5 border-y border-slate-50 dark:border-slate-800/50 my-1 flex items-center gap-1.5 transition-colors">
              <div className="flex items-baseline gap-0.5">
                <span className="text-[12.5px] font-black text-slate-900 dark:text-white tracking-tight">{formatNumber(item.price)}</span>
                <span className="text-[6.5px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">{item.currency === 'USD' ? '$' : 'د.ع'}</span>
              </div>
              <div className="w-[1px] h-2 bg-slate-200 dark:bg-slate-700" />
              <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 italic">کۆد: {item.code}</span>
              <div className="w-[1px] h-2 bg-slate-200 dark:bg-slate-700" />
              <div className="relative group/color">
                <div 
                  className="w-14 h-2.5 rounded-full border border-white dark:border-slate-800 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.1)] ring-[0.5px] ring-slate-100 dark:ring-slate-800 relative overflow-hidden" 
                  style={{ backgroundColor: item.color }}
                >
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                  <div className="absolute top-0 left-0 right-0 h-[0.5px] bg-white/30" />
                </div>
                <div className="absolute inset-0 rounded-full bg-white/10 blur-[1px] opacity-0 group-hover/color:opacity-100 transition-opacity pointer-events-none" />
              </div>
            </div>
  
            <div className="flex items-center justify-between mt-auto">
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(item)}
                  className="w-6.5 h-6.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  title="ڕێکخستن"
                >
                  <SettingsIcon size={11} />
                </button>
                <button 
                  onClick={() => handleViewDetails(item)}
                  className="w-6.5 h-6.5 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                  title="وێنە و وەسف"
                >
                  <ImageIcon size={11} />
                </button>
              </div>
              
              <StockAdjuster 
                stock={item.stock} 
                threshold={item.threshold}
                onUpdate={(val) => updateStock(item, val)} 
              />
            </div>
          </motion.div>
        ))}
      </div>
 
      <ProductModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveProduct}
        onDelete={handleDeleteProduct}
        initialData={selectedItem}
        t={t}
      />
 
      <AnimatePresence>
        {isDetailsModalOpen && selectedItemForDetails && (
          <ProductDetailsModal 
            isOpen={isDetailsModalOpen}
            onClose={() => setIsDetailsModalOpen(false)}
            onSave={handleSaveDetails}
            initialData={selectedItemForDetails}
            t={t}
            spareParts={spareParts}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
