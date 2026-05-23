import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Store, User, Lock, Mail, ArrowRight, Loader2, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';

export default function CreateStore() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const [loginType, setLoginType] = useState<'admin' | 'staff'>('admin');
  
  const [formData, setFormData] = useState({
    storeName: '',
    storeEmail: '',
    adminEmail: '',
    password: '',
    confirmPassword: '',
    invitationKey: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin) {
      if (formData.password !== formData.confirmPassword) {
        setError('ژمارە نهێنییەکان وەک یەک نین');
        return;
      }
      if (formData.storeEmail.toLowerCase() === formData.adminEmail.toLowerCase()) {
        setError('ئیمێڵی کۆگا و ئیمێڵی ئەدمین نابێت وەک یەک بن');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const adminEmail = formData.adminEmail.trim();
      const password = formData.password;
      const storeEmail = formData.storeEmail.trim();
      const invitationKey = formData.invitationKey.trim();

      if (isLogin) {
        if (loginType === 'staff') {
          // --- STAFF LOGIN ---
          // 1. Find store by email
          const storesRef = collection(db, 'stores');
          const q = query(storesRef, where('email', '==', storeEmail), limit(1));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            setError('ئەم ئیمێڵی کۆگایە لە سیستەمدا نییە.');
            setLoading(false);
            return;
          }
          
          const storeDoc = querySnapshot.docs[0];
          const storeId = storeDoc.id;

          // 2. Find staff by invitationKey in that store
          const usersRef = collection(db, 'users');
          const staffQ = query(
            usersRef, 
            where('storeId', '==', storeId), 
            where('invitationKey', '==', invitationKey),
            where('role', '==', 'staff'),
            limit(1)
          );
          const staffSnapshot = await getDocs(staffQ);

          if (staffSnapshot.empty) {
            setError('کلیلی باندگێشت هەڵەیە یان ئەم کارمەندە بوونی نییە.');
            setLoading(false);
            return;
          }

          const staffUser = staffSnapshot.docs[0].data();
          // 3. Login with that user's email and invitationKey (as password)
          await signInWithEmailAndPassword(auth, staffUser.email, invitationKey);
        } else {
          // --- ADMIN LOGIN ---
          await signInWithEmailAndPassword(auth, adminEmail, password);
        }
      } else {
        // --- SIGNUP MODE ---
        // 1. Create User
        const userCredential = await createUserWithEmailAndPassword(
          auth, 
          adminEmail, 
          password
        );
        const user = userCredential.user;

        // 2. Create Store in Firestore
        const storeId = `store_${Date.now()}`;
        const generatedKey = Math.random().toString(36).substring(2, 8).toUpperCase();
        
        const storeData = {
          name: formData.storeName.trim(),
          email: storeEmail,
          ownerId: user.uid,
          invitationKey: generatedKey,
          status: 'active',
          createdAt: serverTimestamp(),
        };

        try {
          await setDoc(doc(db, 'stores', storeId), storeData);
          
          // 3. Update User Profile
          await setDoc(doc(db, 'users', user.uid), {
            name: formData.storeName.trim(),
            email: adminEmail,
            role: 'owner',
            storeId: storeId,
            createdAt: serverTimestamp(),
          });

          setSuccess(true);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `stores/${storeId}`);
        }
      }
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('ئەم ئیمێڵە پێشتر بەکارهێنراوە. تکایە بچۆ ژوورەوە.');
      } else if (err.code === 'auth/user-not-found') {
        setError('هەڵەیە، ئەم ئیمێڵە هەژماری (ئاکاونت) لەسەر دروست نەکراوە.');
      } else if (err.code === 'auth/wrong-password') {
        setError('ژمارەی نهێنی (پاسۆرد) هەڵەیە. تکایە دووبارە هەوڵ بدەرەوە.');
      } else if (err.code === 'auth/invalid-credential') {
        setError(isLogin 
          ? 'هەڵەیە، ئەم ئیمێڵە هەژماری (ئاکاونت) لەسەر دروست نەکراوە یان پاسۆردەکە هەڵەیە.' 
          : 'زانیارییەکان هەڵەن. تکایە دڵنیابەرەوە لە ئیمێڵ و پاسۆردەکەت.');
      } else if (err.code === 'auth/invalid-email') {
        setError('ئیمێڵەکە بە شێوەیەکی ڕاست نەنووسراوە');
      } else if (err.code === 'auth/weak-password') {
        setError('ژمارەی نهێنی دەبێت لانی کەم ٦ پیت یان ژمارە بێت');
      } else {
        setError('هەڵەیەک لە چوونە ژوورەوەدا ڕوویدا. تکایە دڵنیابەرەوە لە ئینتەرنێتەکەت.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center p-8 text-center space-y-4"
      >
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold font-display">کۆگا بە سەرکەوتوویی دروستکرا</h2>
        <p className="text-gray-600 max-w-sm">
          پیرۆزە! کۆگاکەت لە سیستەمەکەدا تۆمارکرا. ئێستا دەتوانیت بچیتە ناو پانێڵی کۆنترۆڵ.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          چوونە ناو پانێڵ
        </button>
      </motion.div>
    );
  }

  return (
    <div className="grid grid-cols-12 grid-rows-8 gap-5 w-full h-full min-h-[700px]" dir="rtl">
      {/* Main Form Card */}
      <div className="bento-card col-span-12 lg:col-span-8 row-span-8">
        <div className="flex justify-between items-start mb-10">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 font-display tracking-tight">
              {isLogin 
                ? (loginType === 'admin' ? 'چوونە ناو سیستم (ئەدمین)' : 'چوونە ناو سیستم (کارمەند)') 
                : 'دروستکردنی کۆگای نوێ'}
            </h1>
            <p className="text-slate-500 font-medium">
              {isLogin 
                ? 'بەخێربێیتەوە! تکایە زانیارییەکانت بنووسە' 
                : 'تکایە زانیارییەکانی کۆگا و ئەدمین لە خوارەوە پڕ بکەرەوە'}
            </p>
          </div>
          <div className="flex gap-2">
            {isLogin && (
              <div className="bg-slate-100 p-1 rounded-xl flex">
                <button
                  type="button"
                  onClick={() => setLoginType('admin')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                    loginType === 'admin' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                  )}
                >
                  ئەدمین
                </button>
                <button
                  type="button"
                  onClick={() => setLoginType('staff')}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition-all",
                    loginType === 'staff' ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"
                  )}
                >
                  کارمەند
                </button>
              </div>
            )}
            <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-bold border border-blue-100 shadow-sm">
              {isLogin ? '١' : '١'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
            >
              <AlertCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          <div className={cn("grid grid-cols-1 gap-10 mb-10", !isLogin && "md:grid-cols-2")}>
            {/* Store Info - Only shown in Signup */}
            {!isLogin && (
              <section>
                <h2 className="card-label">زانیارییەکانی کۆگا</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700 block mr-1">ناوی کۆگا</label>
                    <input
                      type="text"
                      name="storeName"
                      required
                      value={formData.storeName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm placeholder:text-slate-400"
                      placeholder="ناوی کۆگا بنووسە"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[13px] font-bold text-slate-700 block mr-1">ئیمێڵی تایبەت بە کۆگا</label>
                    <input
                      type="email"
                      name="storeEmail"
                      required
                      value={formData.storeEmail}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm placeholder:text-slate-400 text-left"
                      placeholder="store@example.com"
                      dir="ltr"
                    />
                  </div>
                </div>
              </section>
            )}

            {/* Admin Info */}
            <section className={cn(isLogin && "max-w-md mx-auto w-full")}>
              <h2 className="card-label">
                {isLogin 
                  ? (loginType === 'admin' ? 'زانیاری ئەدمین' : 'زانیاری کارمەند') 
                  : 'زانیاری ئەدمینی سەرەکی'}
              </h2>
              <div className="space-y-4">
                {isLogin && loginType === 'staff' ? (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-700 block mr-1">ئیمێڵی کۆگا</label>
                      <input
                        type="email"
                        name="storeEmail"
                        required
                        value={formData.storeEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm placeholder:text-slate-400 text-left"
                        placeholder="store@example.com"
                        dir="ltr"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-700 block mr-1 text-right">کلیلی باندگێشت (Invitation Key)</label>
                      <div className="relative">
                        <input
                          type="password"
                          name="invitationKey"
                          required
                          value={formData.invitationKey}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-left pr-10"
                          dir="ltr"
                          placeholder="کلیلەکە بنووسە"
                        />
                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[13px] font-bold text-slate-700 block mr-1">ئیمێڵی ئەدمین</label>
                      <input
                        type="email"
                        name="adminEmail"
                        required
                        value={formData.adminEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm placeholder:text-slate-400 text-left"
                        placeholder="admin@example.com"
                        dir="ltr"
                      />
                    </div>
                    <div className={cn("grid gap-3", !isLogin ? "grid-cols-2" : "grid-cols-1")}>
                      <div className="space-y-1.5">
                        <label className="text-[13px] font-bold text-slate-700 block mr-1 text-right">ژمارەی نهێنی</label>
                        <input
                          type="password"
                          name="password"
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-left"
                          dir="ltr"
                        />
                      </div>
                      {!isLogin && (
                        <div className="space-y-1.5">
                          <label className="text-[13px] font-bold text-slate-700 block mr-1 text-right">دڵنیایی</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-[14px] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all outline-none text-sm text-left"
                            dir="ltr"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>

          <div className="mt-auto space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 bg-slate-900 text-white rounded-[18px] font-bold hover:bg-slate-800 active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-xl shadow-slate-200/50"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={22} />
                  <span>کەمێک چاوەڕوان بە...</span>
                </>
              ) : (
                <>
                  <span>{isLogin ? 'چوونە ژوورەوە' : 'تۆمارکردنی کۆگا و دەستپێکردن'}</span>
                  <ArrowRight className="rotate-180" size={24} />
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
              }}
              className="w-full py-2 text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors"
            >
              {isLogin ? 'هەژمارت نییە؟ کۆگایەکی نوێ دروست بکە' : 'هەژمارت هەیە؟ بچۆ ژوورەوە'}
            </button>
          </div>
        </form>
      </div>

      {/* Decorative Cards */}
      <div className="hidden lg:flex flex-col gap-5 col-span-4 row-span-8">
        <div className="bento-card flex-1 bg-blue-600 border-none relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="card-label text-blue-100">خێرایی لە کارکردن</h2>
            <p className="text-white text-xl font-bold font-display leading-tight">
              سیستەمی کۆگا ڕێگەت پێدەدات لە کەمتر لە ٣ خولەکدا هەموو بەشەکان ئامادە بکەیت.
            </p>
          </div>
          <div className="mt-auto flex -space-x-3 rtl:space-x-reverse relative z-10">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="w-10 h-10 rounded-full ring-4 ring-blue-600 bg-blue-400 border-2 border-blue-500 shadow-lg"></div>
            ))}
          </div>
          {/* Decorative Circle */}
          <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500 rounded-full blur-3xl opacity-50"></div>
        </div>

        <div className="bento-card h-[220px]">
          <h2 className="card-label">ئاستی ئاسایش</h2>
          <div className="flex items-center gap-4 mb-6">
            <div className="h-3 flex-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: '92%' }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
              ></motion.div>
            </div>
            <span className="text-lg font-black text-emerald-600">٩٢٪</span>
          </div>
          <p className="text-sm font-medium text-slate-500 leading-relaxed">
            پەیوەندییەکانت بە پارێزراوی دەمێننەوە لە ڕێگەی سیستەمی نوێی پاراستنی داتاکانمانەوە.
          </p>
        </div>

        <div className="bento-card h-[130px] bg-slate-900 border-none flex-row items-center justify-between group">
          <div className="flex flex-col justify-center">
            <h2 className="card-label text-slate-400 mb-1">پشتیوانی</h2>
            <p className="text-white text-xl font-bold font-display">٢٤/٧ ئامادەین</p>
          </div>
          <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
            🎧
          </div>
        </div>
      </div>
    </div>
  );
}
