/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Plus, Minus, X, Phone, Instagram, Facebook, MapPin, Trash2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Product {
  id: number;
  name: string;
  image: string;
  price: number;
}

interface CartItem extends Product {
  quantity: number;
}

// --- Data ---
// السعر ثابت 1500 كما طلب العميل
const FIXED_PRICE = 1500;

const PRODUCTS: Product[] = [
  {
    id: 1,
    name: "صندل TWIK البني الفاخر",
    image: "./file_000000007604720a91467b4b3c7dbd22.png",
    price: FIXED_PRICE
  },
  {
    id: 2,
    name: "صندل TWIK العصري",
    image: "./1772641723619.png",
    price: FIXED_PRICE
  },
  {
    id: 3,
    name: "صندل IWAVE البني الأنيق",
    image: "./file_0000000062c0724684d40e3701b3a88d.png",
    price: FIXED_PRICE
  },
  {
    id: 4,
    name: "صندل IWAVE الكلاسيكي",
    image: "./1772637130186.png",
    price: FIXED_PRICE
  },
  {
    id: 5,
    name: "صندل WAVE الأسود الفخم",
    image: "./1772641477765.png",
    price: FIXED_PRICE
  },
  {
    id: 6,
    name: "صندل IWAVE الأسود المريح",
    image: "./1772590382639.png",
    price: FIXED_PRICE
  },
  {
    id: 7,
    name: "صندل البورجي الملكي",
    image: "./1772590225469.png",
    price: FIXED_PRICE
  }
];

const WHATSAPP_NUMBER = "+967734229097";

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // --- Logic ---
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: number, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }, [cart]);

  const totalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleConfirmOrder = () => {
    if (cart.length === 0) return;

    const itemsList = cart.map(item => `${item.name} (العدد: ${item.quantity})`).join('\n');
    const message = `مرحباً متجر البورجي، أريد طلب الصنادل التالية:\n${itemsList}\n| العدد الكلي: ${totalItems} | الإجمالي: ${cartTotal} ريال`;
    
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${WHATSAPP_NUMBER.replace('+', '')}?text=${encodedMessage}`, '_blank');
  };

  return (
    <div className="min-h-screen font-sans bg-white selection:bg-gold/30">
      {/* --- Header --- */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 gold-gradient rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">B</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
              متجر <span className="gold-text-gradient">البورجي</span>
            </h1>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
            <a href="#" className="hover:text-gold transition-colors">الرئيسية</a>
            <a href="#products" className="hover:text-gold transition-colors">المنتجات</a>
            <a href="#about" className="hover:text-gold transition-colors">عن المتجر</a>
          </nav>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
          >
            <ShoppingCart className="w-6 h-6" />
            {totalItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-gold text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* --- Hero Section --- */}
      <section className="relative h-[60vh] flex items-center justify-center overflow-hidden bg-black">
        <div className="absolute inset-0 opacity-60">
          <img 
            src="https://picsum.photos/seed/luxury/1920/1080" 
            alt="Luxury Background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 text-center px-4">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white text-4xl md:text-6xl font-bold mb-4"
          >
            أناقة بلا مساومة
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gold text-lg md:text-xl font-light mb-8"
          >
            التجسيد الحقيقي للفخامة والراحة في كل خطوة
          </motion.p>
          <motion.a 
            href="#products"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="inline-block gold-gradient text-white px-10 py-3 rounded-full font-semibold shadow-xl hover:scale-105 transition-transform"
          >
            تسوق الآن
          </motion.a>
        </div>
      </section>

      {/* --- Products Grid --- */}
      <main id="products" className="max-w-7xl mx-auto px-4 py-20">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <h3 className="text-3xl font-bold mb-2">تشكيلتنا المختارة</h3>
            <div className="h-1 w-20 gold-gradient rounded-full"></div>
          </div>
          <p className="text-gray-500 max-w-md">
            جميع الصنادل في هذه التشكيلة متوفرة بسعر موحد وحصري لفترة محدودة.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {PRODUCTS.map((product) => (
            <motion.div 
              key={product.id}
              whileHover={{ y: -10 }}
              className="group bg-white border border-black/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all"
            >
              <div className="aspect-[3/4] overflow-hidden relative">
                <img 
                  src={product.image} 
                  alt={product.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 right-4">
                  <span className="bg-white/90 backdrop-blur-sm text-black text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                    جديد
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h4 className="font-bold text-lg mb-2 group-hover:text-gold transition-colors">
                  {product.name}
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold gold-text-gradient">
                    {product.price} ريال
                  </span>
                  <button 
                    onClick={() => addToCart(product)}
                    className="p-3 bg-black text-white rounded-xl hover:bg-gold transition-colors shadow-lg"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      {/* --- About Section --- */}
      <section id="about" className="bg-stone-50 py-20">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <img 
              src="https://picsum.photos/seed/craft/800/600" 
              alt="Craftsmanship" 
              className="rounded-3xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-6 -left-6 bg-white p-8 rounded-2xl shadow-xl hidden md:block">
              <p className="text-4xl font-bold gold-text-gradient">10+</p>
              <p className="text-sm text-gray-500">سنوات من الخبرة</p>
            </div>
          </div>
          <div>
            <h3 className="text-3xl font-bold mb-6">لماذا متجر البورجي؟</h3>
            <p className="text-gray-600 leading-relaxed mb-8">
              نحن في متجر البورجي نؤمن أن الحذاء ليس مجرد قطعة ملابس، بل هو تعبير عن الشخصية والذوق الرفيع. نختار منتجاتنا بعناية فائقة لنضمن لك الجمع بين التصميم العصري والراحة المطلقة التي تدوم طوال اليوم.
            </p>
            <ul className="space-y-4">
              {[
                "جلود فاخرة عالية الجودة",
                "تصاميم مريحة للقدمين",
                "أسعار تنافسية وموحدة",
                "خدمة عملاء متميزة"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gold/10 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-gold" />
                  </div>
                  <span className="font-medium">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="bg-black text-white py-16">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 gold-gradient rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <h4 className="text-xl font-bold">متجر <span className="text-gold">البورجي</span></h4>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
              وجهتك الأولى للأحذية والصنادل الراقية في اليمن. جودة، أناقة، وسعر لا يقاوم.
            </p>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-gold">روابط سريعة</h5>
            <ul className="space-y-3 text-sm text-gray-400">
              <li><a href="#" className="hover:text-white transition-colors">الرئيسية</a></li>
              <li><a href="#products" className="hover:text-white transition-colors">المنتجات</a></li>
              <li><a href="#about" className="hover:text-white transition-colors">عن المتجر</a></li>
              <li><a href="#" className="hover:text-white transition-colors">سياسة التوصيل</a></li>
            </ul>
          </div>
          <div>
            <h5 className="font-bold mb-6 text-gold">تواصل معنا</h5>
            <ul className="space-y-4 text-sm text-gray-400">
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-gold" />
                <span>{WHATSAPP_NUMBER}</span>
              </li>
              <li className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-gold" />
                <span>اليمن - صنعاء</span>
              </li>
              <li className="flex gap-4 pt-4">
                <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-gold transition-colors">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-gold transition-colors">
                  <Facebook className="w-4 h-4" />
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-16 pt-8 border-t border-white/10 text-center text-xs text-gray-500">
          جميع الحقوق محفوظة © {new Date().getFullYear()} متجر البورجي للأحذية الراقية
        </div>
      </footer>

      {/* --- Cart Sidebar --- */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-50 shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-gold" />
                  <h2 className="text-xl font-bold">سلة المشتريات</h2>
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="w-10 h-10 text-stone-300" />
                    </div>
                    <p className="text-gray-500">سلتك فارغة حالياً</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="mt-4 text-gold font-bold hover:underline"
                    >
                      ابدأ التسوق الآن
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {cart.map((item) => (
                      <div key={item.id} className="flex gap-4 group">
                        <div className="w-20 h-24 rounded-xl overflow-hidden bg-stone-100 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <h5 className="font-bold text-sm">{item.name}</h5>
                            <button 
                              onClick={() => removeFromCart(item.id)}
                              className="text-gray-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-gold text-sm font-bold mb-3">{item.price} ريال</p>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-bold text-sm w-4 text-center">{item.quantity}</span>
                            <button 
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {cart.length > 0 && (
                <div className="p-6 bg-stone-50 border-t">
                  <div className="flex justify-between mb-6">
                    <span className="text-gray-500">الإجمالي الكلي</span>
                    <span className="text-2xl font-bold gold-text-gradient">{cartTotal} ريال</span>
                  </div>
                  <button 
                    onClick={handleConfirmOrder}
                    className="w-full gold-gradient text-white py-4 rounded-2xl font-bold shadow-lg flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all"
                  >
                    تأكيد الطلب عبر واتساب
                    <Phone className="w-5 h-5" />
                  </button>
                  <p className="text-center text-[10px] text-gray-400 mt-4">
                    سيتم توجيهك إلى واتساب لإرسال تفاصيل الطلب مباشرة
                  </p>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* --- Success Toast --- */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] bg-black text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3"
          >
            <CheckCircle2 className="w-5 h-5 text-gold" />
            <span className="text-sm font-bold">تمت الإضافة للسلة بنجاح</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
