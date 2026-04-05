import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../context/ThemeContext'
import { ThemeToggle } from '../components/common/index'

// ── Floating spice particle ──────────────────────────────────────────────────
const Particle = ({ style }) => (
  <div className="absolute pointer-events-none select-none animate-float opacity-20 text-2xl" style={style} />
)

// ── Counter animation hook ───────────────────────────────────────────────────
const useCounter = (target, duration = 2000, start = false) => {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

// ── Intersection observer hook ───────────────────────────────────────────────
const useInView = (threshold = 0.2) => {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true) },
      { threshold }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [threshold])
  return [ref, inView]
}

// ── Typewriter component ─────────────────────────────────────────────────────
const Typewriter = ({ texts, speed = 80 }) => {
  const [display, setDisplay] = useState('')
  const [idx, setIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const current = texts[idx]
    const timeout = setTimeout(() => {
      if (!deleting) {
        setDisplay(current.slice(0, charIdx + 1))
        if (charIdx + 1 === current.length) {
          setTimeout(() => setDeleting(true), 1800)
        } else setCharIdx(c => c + 1)
      } else {
        setDisplay(current.slice(0, charIdx - 1))
        if (charIdx - 1 === 0) {
          setDeleting(false)
          setIdx(i => (i + 1) % texts.length)
          setCharIdx(0)
        } else setCharIdx(c => c - 1)
      }
    }, deleting ? speed / 2 : speed)
    return () => clearTimeout(timeout)
  }, [charIdx, deleting, idx, texts, speed])

  return (
    <span>
      {display}
      <span className="animate-pulse text-amber-500">|</span>
    </span>
  )
}

// ── Maharashtra cuisine showcase ─────────────────────────────────────────────
const MAHARASHTRA_DISHES = [
  { name: 'Misal Pav', emoji: '🌶️', desc: 'Spicy sprouted moth beans curry', region: 'Pune' },
  { name: 'Puran Poli', emoji: '🫓', desc: 'Sweet flatbread with jaggery filling', region: 'Konkan' },
  { name: 'Vada Pav', emoji: '🍔', desc: 'Mumbai\'s beloved street burger', region: 'Mumbai' },
  { name: 'Sabudana Khichdi', emoji: '🍚', desc: 'Tapioca pearls with peanuts', region: 'Nashik' },
  { name: 'Thalipeeth', emoji: '🫔', desc: 'Multi-grain savory pancake', region: 'Vidarbha' },
  { name: 'Modak', emoji: '🍡', desc: 'Lord Ganesha\'s favourite sweet', region: 'Raigad' },
]

// ── Story cards data ─────────────────────────────────────────────────────────
const STORIES = [
  {
    icon: '🏠',
    title: 'Cooking with love since always',
    desc: 'Behind every cloud kitchen is a real person — an aayi, a tai, a bhaiya — who wakes up at dawn to knead dough and grind fresh masalas. They\'ve been doing this their whole life. Now they deserve to be seen.',
    color: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    border: 'border-amber-200 dark:border-amber-800',
  },
  {
    icon: '😔',
    title: 'Lost in the noise of big restaurants',
    desc: 'On popular food apps, cloud kitchens get buried under five-star dine-in restaurants with fancy photography and bigger marketing budgets. The home cook with the best Misal Pav in Pune never gets discovered.',
    color: 'from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20',
    border: 'border-rose-200 dark:border-rose-800',
  },
  {
    icon: '✨',
    title: 'CloudBite changes the game',
    desc: 'We built CloudBite exclusively for cloud kitchens. No dine-in restaurants allowed. Every single kitchen here is a home kitchen — passionate, authentic, and run by people who put love in every bite they make.',
    color: 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
]

// ── How it works steps ───────────────────────────────────────────────────────
const HOW_IT_WORKS = [
  { step: '01', icon: '🔍', title: 'Discover', desc: 'Browse cloud kitchens in Maharashtra. Filter by cuisine — Breakfast, Starters, Main Course, Desserts.' },
  { step: '02', icon: '🛒', title: 'Order', desc: 'Pick your favourite dishes, add to cart. Pay online via Razorpay or choose Cash on Delivery.' },
  { step: '03', icon: '👨‍🍳', title: 'Kitchen cooks', desc: 'Your home chef gets the order, preps it fresh with love, and packages it carefully just for you.' },
  { step: '04', icon: '🛵', title: 'Delivered with care', desc: 'Our delivery partner picks up and brings it hot to your doorstep. Track live on the map.' },
]

export default function LandingPage() {
  const navigate = useNavigate()
  const { isDark } = useTheme()
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [activeSlide, setActiveSlide] = useState(0)

  // Stats section
  const [statsRef, statsInView] = useInView()
  const kitchens  = useCounter(150, 2200, statsInView)
  const orders    = useCounter(12000, 2500, statsInView)
  const customers = useCounter(8500, 2300, statsInView)
  const cities    = useCounter(12, 1800, statsInView)

  // Dish carousel auto-rotate
  useEffect(() => {
    const t = setInterval(() => setActiveSlide(p => (p + 1) % MAHARASHTRA_DISHES.length), 3000)
    return () => clearInterval(t)
  }, [])

  // Navbar scroll effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Particles data
  const particles = ['🌶️','🫓','🍛','🌿','⭐','🫚','🧅','🫛','🍋','🌾']
    .map((emoji, i) => ({
      emoji,
      style: {
        left: `${(i * 10.3) % 95}%`,
        top: `${(i * 17.7) % 80}%`,
        animationDelay: `${i * 0.4}s`,
        fontSize: `${1.2 + (i % 3) * 0.4}rem`,
        animationDuration: `${4 + (i % 3)}s`,
      }
    }))

  return (
    <div className="min-h-screen bg-[#fdf8f0] dark:bg-[#0f0a05] text-gray-900 dark:text-gray-100 transition-colors duration-500 overflow-x-hidden">

      {/* ── NAVBAR ───────────────────────────────────────────── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'bg-[#fdf8f0]/95 dark:bg-[#0f0a05]/95 backdrop-blur-xl shadow-md border-b border-amber-100 dark:border-amber-900/30' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <span className="text-3xl animate-float">🍽️</span>
            <span className="font-display text-2xl font-bold">
              <span className="text-amber-600 dark:text-amber-400">Cloud</span>
              <span className="font-hand text-orange-500">Bite</span>
            </span>
          </div>

          {/* Nav links desktop */}
          <div className="hidden md:flex items-center gap-8">
            {['Our Story', 'How It Works', 'Maharashtra Flavours', 'Join Us'].map(link => (
              <a key={link} href={`#${link.toLowerCase().replace(/ /g,'-')}`}
                className="font-body text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors duration-200">
                {link}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={() => navigate('/login')}
              className="hidden md:block font-body font-bold text-sm px-4 py-2 rounded-xl border-2 border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-500 hover:text-white transition-all duration-200">
              Login
            </button>
            <button onClick={() => navigate('/register')}
              className="font-body font-bold text-sm px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg hover:shadow-amber-400/40 hover:scale-105 transition-all duration-200">
              Order Now
            </button>
          </div>
        </div>
      </nav>

      {/* ── HERO SECTION ─────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background texture */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-100/60 via-orange-50/30 to-transparent dark:from-amber-900/20 dark:via-orange-900/10 dark:to-transparent" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f59e0b' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E")` }} />

        {/* Floating particles */}
        {particles.map((p, i) => <Particle key={i} style={p.style} />)}

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="animate-slide-up">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-xs font-body font-bold px-4 py-2 rounded-full mb-6 border border-amber-200 dark:border-amber-800">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              🇮🇳 Made for Maharashtra's Home Kitchens
            </div>

            {/* Main headline */}
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="text-gray-900 dark:text-white">Where</span>{' '}
              <span className="relative inline-block">
                <span className="text-amber-600 dark:text-amber-400">Home-Cooked</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 200 8" fill="none">
                  <path d="M0 6 Q50 0 100 6 Q150 12 200 6" stroke="#f59e0b" strokeWidth="3" fill="none" strokeLinecap="round"/>
                </svg>
              </span>{' '}
              <br />
              <span className="text-gray-900 dark:text-white">Meals</span>{' '}
              <span className="font-hand text-orange-500 italic">find you</span>
            </h1>

            <p className="font-body text-lg text-gray-600 dark:text-gray-400 mb-4 max-w-lg leading-relaxed">
              Every kitchen on CloudBite is a <strong className="text-amber-700 dark:text-amber-400">real home</strong> — no dine-in, no fancy décor. Just a passionate cook making food the way your aayi would.
            </p>

            {/* Typewriter */}
            <p className="font-hand text-2xl text-orange-500 dark:text-orange-400 mb-8 h-8">
              <Typewriter texts={['Misal from Pune...', 'Modak from Raigad...', 'Thalipeeth from Vidarbha...', 'Puran Poli from Konkan...', 'Vada Pav from Mumbai...']} />
            </p>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4">
              <button onClick={() => navigate('/register')}
                className="group flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-8 py-4 rounded-2xl shadow-lg shadow-amber-400/30 hover:shadow-amber-400/60 hover:scale-105 active:scale-95 transition-all duration-300">
                <span className="text-xl">🍽️</span>
                Start Ordering
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </button>
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-white dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-body font-bold px-8 py-4 rounded-2xl border-2 border-amber-200 dark:border-amber-800 hover:border-amber-500 hover:shadow-lg transition-all duration-300">
                <span>🏪</span>
                I'm a Kitchen Owner
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap items-center gap-6 mt-10">
              {[['🏠', '150+', 'Home Kitchens'], ['🛵', '12K+', 'Orders Delivered'], ['⭐', '4.8', 'Avg Rating']].map(([icon, val, label]) => (
                <div key={label} className="flex items-center gap-2">
                  <span className="text-xl">{icon}</span>
                  <div>
                    <p className="font-display font-bold text-amber-700 dark:text-amber-400 text-lg leading-none">{val}</p>
                    <p className="font-body text-xs text-gray-500 dark:text-gray-400">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: dish carousel */}
          <div className="relative hidden lg:flex items-center justify-center">
            {/* Spinning ring */}
            <div className="absolute w-80 h-80 rounded-full border-2 border-dashed border-amber-300/40 dark:border-amber-700/40 animate-spin-slow" />
            <div className="absolute w-96 h-96 rounded-full border border-orange-200/30 dark:border-orange-800/30 animate-spin-slow" style={{ animationDirection: 'reverse', animationDuration: '12s' }} />

            {/* Center dish card */}
            <div className="relative w-72 h-72 flex flex-col items-center justify-center">
              <div className="text-9xl mb-4 transition-all duration-500 animate-bounce-soft">
                {MAHARASHTRA_DISHES[activeSlide].emoji}
              </div>
              <div className="text-center bg-white/80 dark:bg-amber-900/30 backdrop-blur-sm rounded-2xl px-6 py-3 border border-amber-100 dark:border-amber-800 shadow-xl">
                <p className="font-display font-bold text-xl text-gray-900 dark:text-white">
                  {MAHARASHTRA_DISHES[activeSlide].name}
                </p>
                <p className="font-body text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {MAHARASHTRA_DISHES[activeSlide].desc}
                </p>
                <span className="inline-block mt-2 text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">
                  📍 {MAHARASHTRA_DISHES[activeSlide].region}
                </span>
              </div>
            </div>

            {/* Orbiting dish dots */}
            {MAHARASHTRA_DISHES.map((dish, i) => {
              const angle = (i / MAHARASHTRA_DISHES.length) * 2 * Math.PI
              const r = 155
              return (
                <button key={i}
                  onClick={() => setActiveSlide(i)}
                  style={{
                    position: 'absolute',
                    left: `calc(50% + ${Math.cos(angle) * r}px - 20px)`,
                    top: `calc(50% + ${Math.sin(angle) * r}px - 20px)`,
                  }}
                  className={`w-10 h-10 rounded-full text-xl flex items-center justify-center transition-all duration-300 ${
                    activeSlide === i
                      ? 'bg-amber-500 shadow-lg shadow-amber-400/40 scale-125'
                      : 'bg-white dark:bg-amber-900/40 shadow opacity-60 hover:opacity-100 hover:scale-110'
                  }`}>
                  {dish.emoji}
                </button>
              )
            })}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce-soft">
          <span className="font-hand text-sm text-amber-600 dark:text-amber-400">Scroll to explore</span>
          <div className="w-6 h-10 rounded-full border-2 border-amber-400 flex items-start justify-center p-1">
            <div className="w-1.5 h-3 bg-amber-400 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── STATS SECTION ────────────────────────────────────── */}
      <section ref={statsRef} className="py-20 bg-gradient-to-r from-amber-500 to-orange-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='3'/%3E%3C/g%3E%3C/svg%3E")` }} />
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { val: kitchens, suffix: '+', label: 'Cloud Kitchens', icon: '🏠' },
            { val: orders, suffix: '+', label: 'Orders Delivered', icon: '🛵' },
            { val: customers, suffix: '+', label: 'Happy Customers', icon: '😊' },
            { val: cities, suffix: '', label: 'Cities in Maharashtra', icon: '📍' },
          ].map(({ val, suffix, label, icon }) => (
            <div key={label} className="text-white">
              <div className="text-4xl mb-2">{icon}</div>
              <div className="font-display text-4xl md:text-5xl font-bold mb-1">
                {val.toLocaleString()}{suffix}
              </div>
              <div className="font-body text-sm text-white/80">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── OUR STORY SECTION ────────────────────────────────── */}
      <section id="our-story" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="font-hand text-amber-600 dark:text-amber-400 text-xl">Our Story</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mt-2">
            The story behind every <span className="text-amber-600 dark:text-amber-400 font-hand italic">CloudBite</span>
          </h2>
          <p className="font-body text-gray-500 dark:text-gray-400 mt-4 max-w-2xl mx-auto text-lg">
            There are thousands of home cooks across Maharashtra making extraordinary food. Most of them are invisible. We're here to change that.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STORIES.map(({ icon, title, desc, color, border }, i) => (
            <div key={i}
              className={`group relative rounded-3xl p-8 bg-gradient-to-br ${color} border ${border} transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl cursor-default overflow-hidden`}
              style={{ animationDelay: `${i * 0.15}s` }}>
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-700" />
              <div className="text-5xl mb-4">{icon}</div>
              <h3 className="font-display text-xl font-bold text-gray-900 dark:text-white mb-3">{title}</h3>
              <p className="font-body text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
              <div className="mt-4 w-8 h-1 bg-amber-400 rounded-full group-hover:w-16 transition-all duration-300" />
            </div>
          ))}
        </div>

        {/* Vision quote */}
        <div className="mt-16 relative rounded-3xl overflow-hidden bg-gradient-to-br from-amber-900 to-orange-900 p-12 text-center">
          <div className="absolute inset-0 opacity-10"
            style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='white'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/svg%3E")` }} />
          <div className="relative z-10">
            <p className="font-hand text-5xl text-amber-300 leading-none mb-4">"</p>
            <p className="font-display text-2xl md:text-3xl font-bold text-white max-w-3xl mx-auto leading-relaxed">
              When a home cook becomes a cloud kitchen owner, they don't just earn — they share a piece of their culture, their family, and their heart with every dish they send out.
            </p>
            <p className="font-hand text-amber-400 text-xl mt-6">— The CloudBite Vision</p>
          </div>
        </div>
      </section>

      {/* ── MAHARASHTRA FLAVOURS SECTION ─────────────────────── */}
      <section id="maharashtra-flavours" className="py-24 bg-amber-50/50 dark:bg-amber-900/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="font-hand text-amber-600 dark:text-amber-400 text-xl">Maharashtra Flavours</span>
            <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mt-2">
              Taste every <span className="text-amber-600 dark:text-amber-400 font-hand italic">corner</span> of Maharashtra
            </h2>
            <p className="font-body text-gray-500 dark:text-gray-400 mt-4 text-lg">
              From the coastal Konkan to the heat of Vidarbha — every region, every flavour, now at your door.
            </p>
          </div>

          {/* Cuisine category cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { name: 'Breakfast', icon: '🌅', dishes: 'Poha, Upma, Sabudana Khichdi', bg: 'from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30', border: 'border-yellow-200 dark:border-yellow-800' },
              { name: 'Starters', icon: '🌶️', dishes: 'Misal, Bhel Puri, Kanda Bhaji', bg: 'from-red-50 to-rose-100 dark:from-red-900/30 dark:to-rose-900/30', border: 'border-red-200 dark:border-red-800' },
              { name: 'Main Course', icon: '🍛', dishes: 'Varan Bhat, Puran Poli, Bharli Vangi', bg: 'from-orange-50 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30', border: 'border-orange-200 dark:border-orange-800' },
              { name: 'Desserts', icon: '🍮', dishes: 'Modak, Shrikhand, Basundi', bg: 'from-pink-50 to-rose-100 dark:from-pink-900/30 dark:to-rose-900/30', border: 'border-pink-200 dark:border-pink-800' },
            ].map(({ name, icon, dishes, bg, border }) => (
              <div key={name} className={`group rounded-3xl p-6 bg-gradient-to-br ${bg} border ${border} hover:-translate-y-2 hover:shadow-xl transition-all duration-400 cursor-pointer`}>
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</div>
                <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-1">{name}</h3>
                <p className="font-body text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{dishes}</p>
              </div>
            ))}
          </div>

          {/* Maharashtra dish showcase */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {MAHARASHTRA_DISHES.map(({ name, emoji, region }, i) => (
              <div key={name}
                className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-white dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/40 hover:border-amber-400 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="text-4xl group-hover:scale-125 transition-transform duration-300">{emoji}</div>
                <p className="font-body font-bold text-xs text-gray-800 dark:text-gray-200 text-center">{name}</p>
                <span className="text-[10px] font-body text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">📍{region}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <span className="font-hand text-amber-600 dark:text-amber-400 text-xl">Simple & Easy</span>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mt-2">
            How <span className="text-amber-600 dark:text-amber-400 font-hand italic">CloudBite</span> works
          </h2>
        </div>

        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-16 left-[12%] right-[12%] h-0.5 bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 dark:from-amber-700 dark:via-orange-600 dark:to-amber-700" />

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {HOW_IT_WORKS.map(({ step, icon, title, desc }, i) => (
              <div key={step} className="flex flex-col items-center text-center group"
                style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="relative mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center text-3xl group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-amber-400/30 transition-all duration-300">
                    {icon}
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-amber-500 text-white text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-gray-900 dark:text-white mb-2">{title}</h3>
                <p className="font-body text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── JOIN US SECTION ───────────────────────────────────── */}
      <section id="join-us" className="py-24 bg-amber-50/50 dark:bg-amber-900/5">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Customer card */}
          <div className="group relative rounded-3xl p-10 bg-gradient-to-br from-amber-500 to-orange-500 overflow-hidden cursor-pointer hover:scale-[1.02] transition-all duration-400 shadow-xl shadow-amber-400/20">
            <div className="absolute -bottom-8 -right-8 text-[120px] opacity-20 group-hover:opacity-30 transition-opacity">🛒</div>
            <div className="relative z-10">
              <span className="text-5xl">😋</span>
              <h3 className="font-display text-3xl font-bold text-white mt-4 mb-3">I'm Hungry!</h3>
              <p className="font-body text-white/80 mb-6">Discover authentic Maharashtra home food, place orders, and track live delivery.</p>
              <button onClick={() => navigate('/register')}
                className="flex items-center gap-2 bg-white text-amber-600 font-body font-bold px-6 py-3 rounded-xl hover:shadow-lg transition-all duration-200 group-hover:translate-x-1">
                Order as Customer <span>→</span>
              </button>
            </div>
          </div>

          {/* Kitchen owner card */}
          <div className="group relative rounded-3xl p-10 bg-white dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-amber-400 transition-all duration-400">
            <div className="absolute -bottom-8 -right-8 text-[120px] opacity-10 group-hover:opacity-20 transition-opacity">🍳</div>
            <div className="relative z-10">
              <span className="text-5xl">👨‍🍳</span>
              <h3 className="font-display text-3xl font-bold text-gray-900 dark:text-white mt-4 mb-3">I Run a Cloud Kitchen</h3>
              <p className="font-body text-gray-600 dark:text-gray-400 mb-6">Get your credentials from our admin team and start listing your home-cooked food today.</p>
              <button onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-body font-bold px-6 py-3 rounded-xl hover:shadow-orange transition-all duration-200 group-hover:translate-x-1">
                Kitchen Owner Login <span>→</span>
              </button>
              <p className="text-xs font-body text-gray-400 mt-3">Need access? Contact cloudbiteowner@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────── */}
      <footer className="bg-amber-900 dark:bg-[#0a0603] text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-start justify-between gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">🍽️</span>
                <span className="font-display text-2xl font-bold">
                  Cloud<span className="font-hand text-amber-400">Bite</span>
                </span>
              </div>
              <p className="font-body text-amber-200/70 max-w-xs text-sm leading-relaxed">
                Empowering Maharashtra's cloud kitchens to reach every home. Real food, real people, real flavour.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-16 gap-y-3">
              {['Our Story', 'How It Works', 'Maharashtra Flavours', 'For Kitchen Owners', 'Privacy Policy', 'Terms of Service'].map(link => (
                <a key={link} href="#" className="font-body text-sm text-amber-200/60 hover:text-amber-300 transition-colors">{link}</a>
              ))}
            </div>
          </div>
          <div className="border-t border-amber-800 dark:border-amber-900 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="font-body text-sm text-amber-200/50">
              © 2024 CloudBite. Made with ❤️ for Maharashtra's home kitchens.
            </p>
            <p className="font-hand text-amber-400 text-lg">आपल्या घरचं जेवण, आपल्या दारी 🏠</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
