import { useState, useEffect } from 'react'
import { kitchenAPI } from '../../services/api'
import { Modal, ConfirmModal, EmptyState } from '../../components/common/index'
import { formatCurrency } from '../../utils/helpers'
import toast from 'react-hot-toast'

const CATEGORIES = ['Breakfast', 'Starters', 'Main Course', 'Desserts']

const SUB_CATEGORIES = {
  'Breakfast': ['South Indian', 'Maharashtrian', 'Sandwiches', 'Parathas', 'Chai & Coffee', 'Poha & Upma', 'Idli & Dosa', 'Bhel & Sev'],
  'Starters': ['Chinese Starters', 'Indian Starters', 'Momos', 'Fried Rice', 'Noodles', 'Tandoor Starters', 'Pakodas', 'Rolls'],
  'Main Course': ['Indian Main Course', 'Chinese', 'Breads', 'Rice', 'Pulao & Biryani', 'Curries', 'Dal & Sambar', 'Rajasthani', 'Punjabi'],
  'Desserts': ['Cakes', 'Indian Desserts', 'Fusion Desserts', 'Ice Creams', 'Shakes', 'Pastries', 'Mithai']
}

const emptyForm = { name: '', description: '', price: '', category: '', subCategory: '', imageUrl: '', isVeg: true, preparationTime: 20 }

export default function KitchenMenu() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [filterCat, setFilterCat] = useState('ALL')
  const [search, setSearch] = useState('')

  const fetch = () => {
    kitchenAPI.getMenu()
      .then(r => { 
        console.log('Menu loaded:', r.data); 
        setItems(Array.isArray(r.data) ? r.data : []) 
      })
      .catch(err => { 
        console.error('Menu load error:', err); 
        if (err.response?.status !== 404) toast.error('Failed to load menu') 
      })
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const handleOpenForm = (item = null) => {
    setEditItem(item)
    setForm(item ? { 
        name: item.name, 
        description: item.description || '', 
        price: item.price, 
        category: item.category || '', 
        subCategory: item.subCategory || '',
        imageUrl: item.imageUrl || '', 
        isVeg: item.isVeg, 
        preparationTime: item.preparationTime || 20 
      } : emptyForm)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.category) { toast.error('Fill required fields'); return }
    try {
      if (editItem) { await kitchenAPI.updateMenuItem(editItem.id, { ...form, price: Number(form.price) }); toast.success('Item updated!') }
      else { await kitchenAPI.addMenuItem({ ...form, price: Number(form.price) }); toast.success('Item added! 🍽️') }
      setShowForm(false)
      fetch()
    } catch { toast.error('Failed to save item') }
  }

  const handleToggle = async (id) => {
    try { await kitchenAPI.toggleItemAvailability(id); fetch() }
    catch { toast.error('Failed') }
  }

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const categories = ['ALL', ...new Set(items.map(i => i.category).filter(Boolean))]
  const filtered = items.filter(i => {
    const matchCat = filterCat === 'ALL' || i.category === filterCat
    const matchSearch = !search || i.name?.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-2xl shadow-lg">🍽️</div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Menu Management</h1>
            <p className="text-sm font-body text-gray-500 dark:text-gray-400">{items.length} dishes • {categories.length - 1} categories</p>
          </div>
        </div>
        <button onClick={() => handleOpenForm()} className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-body font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2">
          <span className="text-lg">➕</span> Add Dish
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white dark:bg-[#1a1108] rounded-2xl p-4 border border-amber-100 dark:border-amber-900/40 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search your dishes..." 
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-body focus:border-orange-400 focus:outline-none transition-colors" />
          </div>
        </div>
        
        {/* Category Pills */}
        <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar pb-1">
          <button onClick={() => setFilterCat('ALL')}
            className={`px-4 py-2 rounded-full text-sm font-body font-bold whitespace-nowrap transition-all ${
              filterCat === 'ALL' 
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' 
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-orange-100 dark:hover:bg-orange-900/30'
            }`}>
            🍽️ All
          </button>
          {categories.filter(c => c !== 'ALL').map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-4 py-2 rounded-full text-sm font-body font-bold whitespace-nowrap transition-all ${
                filterCat === cat 
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-orange-100 dark:hover:bg-orange-900/30'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => <div key={i} className="h-72 rounded-3xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🍽️" title={items.length === 0 ? "No dishes yet" : "No matching dishes"}
          message={items.length === 0 ? "Add your first dish to get started!" : "Try a different filter"}
          action={items.length === 0 ? <button onClick={() => handleOpenForm()} className="btn-primary">Add First Dish</button> : null} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filtered.map(item => (
            <div key={item.id} className={`bg-white dark:bg-[#1a1108] rounded-3xl border-2 overflow-hidden transition-all hover:shadow-xl hover:shadow-orange-200/30 dark:hover:shadow-orange-900/20 hover:-translate-y-1 ${!item.isAvailable ? 'opacity-60 border-gray-200' : 'border-amber-100 dark:border-amber-900/40'}`}>
              {/* Image */}
              <div className="relative h-44 overflow-hidden">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                    onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
                ) : null}
                <div className={`${item.imageUrl ? 'hidden' : 'flex'} w-full h-full bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 items-center justify-center text-5xl`}>
                  🍛
                </div>
                
                {/* Gradient overlay */}
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-col gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.isVeg ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                  </span>
                </div>
                
                <div className="absolute top-3 right-3 flex gap-2">
                  <button onClick={() => handleOpenForm(item)} className="w-8 h-8 bg-white/90 dark:bg-gray-800/90 rounded-full flex items-center justify-center text-sm shadow-md hover:bg-white transition-colors">✏️</button>
                  <button onClick={() => handleToggle(item.id)} className={`px-3 py-1 rounded-full text-xs font-bold shadow-md transition-colors ${
                    item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.isAvailable ? '✅' : '❌'}
                  </button>
                </div>
                
                {item.isBestSeller && (
                  <div className="absolute bottom-3 left-3 px-2.5 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded-full shadow-md">⭐ Bestseller</div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white text-lg leading-tight">{item.name}</h3>
                  <span className="font-display font-bold text-orange-600 dark:text-orange-400 text-lg whitespace-nowrap">{formatCurrency(item.price)}</span>
                </div>
                
                {item.description && (
                  <p className="text-xs font-body text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{item.description}</p>
                )}
                
                {/* Category tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {item.category && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40 text-orange-700 dark:text-orange-300 text-xs font-medium rounded-md">
                      {item.category}
                    </span>
                  )}
                  {item.subCategory && item.subCategory !== 'General' && (
                    <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-md">
                      {item.subCategory}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-xs font-body text-gray-400">⏱️ {item.preparationTime || 20} min</span>
                  <button onClick={() => setDeleteId(item.id)} className="text-xs text-red-500 hover:text-red-700 font-medium">🗑️ Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title={editItem ? '✏️ Edit Dish' : '➕ Add New Dish'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="input-label">Dish Name *</label>
              <input value={form.name} onChange={set('name')} placeholder="e.g. Butter Chicken" className="input-field" required />
            </div>
            <div>
              <label className="input-label">Price (₹) *</label>
              <input type="number" value={form.price} onChange={set('price')} placeholder="250" className="input-field" required min="1" />
            </div>
            <div>
              <label className="input-label">Category *</label>
              <select value={form.category} onChange={e => { set('category')(e); setForm(p => ({...p, subCategory: ''})) }} className="input-field" required>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {form.category && SUB_CATEGORIES[form.category] && (
              <div>
                <label className="input-label">Sub Category</label>
                <select value={form.subCategory} onChange={set('subCategory')} className="input-field">
                  <option value="">Select sub category (optional)</option>
                  {SUB_CATEGORIES[form.category].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="input-label">Preparation Time (min)</label>
              <input type="number" value={form.preparationTime} onChange={set('preparationTime')} className="input-field" min="1" max="120" />
            </div>
            <div>
              <label className="input-label">Type</label>
              <select value={form.isVeg} onChange={e => setForm(p => ({...p, isVeg: e.target.value === 'true'}))} className="input-field">
                <option value="true">🟢 Vegetarian</option>
                <option value="false">🔴 Non-Vegetarian</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Describe this dish..." className="input-field resize-none" rows={3} />
          </div>
          <div>
            <label className="input-label">Image URL</label>
            <input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://..." className="input-field" />
          </div>
          {form.imageUrl && (
            <img src={form.imageUrl} alt="Preview" className="w-full h-32 object-cover rounded-xl" onError={e => e.target.style.display='none'} />
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowForm(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editItem ? 'Update Dish' : 'Add Dish'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await kitchenAPI.deleteMenuItem(deleteId); toast.success('Item deleted'); fetch() }}
        title="Delete Dish?" message="This will permanently remove the dish from your menu." confirmText="Delete" danger />
    </div>
  )
}
