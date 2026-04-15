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
      .then(r => setItems(asArray(r.data)))
      .catch(err => { if (err.response?.status !== 404) toast.error('Failed to load menu') })
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Menu Management 🍽️</h1>
          <p className="text-sm font-body text-gray-500 dark:text-gray-400">{items.length} items on menu</p>
        </div>
        <button onClick={() => handleOpenForm()} className="btn-primary flex items-center gap-2">
          <span>➕</span> Add Dish
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search dishes..." className="input-field pl-10" />
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map(cat => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-body font-bold whitespace-nowrap transition-all ${
                filterCat === cat ? 'bg-orange-gradient text-white' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border'
              }`}>
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Items grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 rounded-3xl shimmer" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🍽️" title={items.length === 0 ? "No dishes yet" : "No matching dishes"}
          message={items.length === 0 ? "Add your first dish to get started!" : "Try a different filter"}
          action={items.length === 0 ? <button onClick={() => handleOpenForm()} className="btn-primary">Add First Dish</button> : null} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div key={item.id} className={`card overflow-hidden group transition-all ${!item.isAvailable ? 'opacity-60' : ''}`}>
              <div className="relative">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} className="w-full h-40 object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-40 bg-orange-gradient flex items-center justify-center text-4xl">🍽️</div>
                )}
                <div className="absolute top-3 left-3 flex gap-2">
                  <span className={item.isVeg ? 'badge-veg' : 'badge-nonveg'}>{item.isVeg ? '🟢 Veg' : '🔴 Non-Veg'}</span>
                  {item.isBestSeller && <span className="badge bg-yellow-100 text-yellow-700">⭐ Best Seller</span>}
                </div>
                <button
                  onClick={() => handleToggle(item.id)}
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                    item.isAvailable ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                  {item.isAvailable ? '✅ Available' : '❌ Unavailable'}
                </button>
              </div>

              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display font-bold text-gray-900 dark:text-white leading-tight">{item.name}</h3>
                  <span className="font-display font-bold text-orange-600 dark:text-orange-400 whitespace-nowrap">{formatCurrency(item.price)}</span>
                </div>
                {item.description && (
                  <p className="text-xs font-body text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{item.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-body text-gray-400">⏱️ {item.preparationTime} min</span>
                    {item.category && (
                      <span className="text-xs font-body bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-lg">{item.category}</span>
                    )}
                    {item.subCategory && (
                      <span className="text-xs font-body bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded-lg">{item.subCategory}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleOpenForm(item)} className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 transition-colors font-body font-bold">✏️ Edit</button>
                    <button onClick={() => setDeleteId(item.id)} className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 transition-colors">🗑️</button>
                  </div>
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
