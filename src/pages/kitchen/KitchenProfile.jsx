import { useState, useEffect } from 'react'
import { kitchenAPI } from '../../services/api'
import toast from 'react-hot-toast'

export default function KitchenProfilePage() {
  const [form, setForm] = useState({
    name: '', description: '', cuisineType: '', address: '', city: '', pincode: '',
    phone: '', logoImage: '', coverImage: '', openingTime: '09:00', closingTime: '22:00',
    minOrderAmount: 100, estimatedDeliveryTime: 30, deliveryFee: 30, deliveryRadius: 5,
    latitude: '', longitude: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    kitchenAPI.getProfile()
      .then(r => {
        const k = r.data
        setForm({
          name: k.name || '', description: k.description || '',
          cuisineType: k.cuisineType || '', address: k.address || '',
          city: k.city || '', pincode: k.pincode || '',
          phone: k.phone || '', logoImage: k.logoImage || '', coverImage: k.coverImage || '',
          openingTime: k.openingTime || '09:00', closingTime: k.closingTime || '22:00',
          minOrderAmount: k.minOrderAmount || 100, estimatedDeliveryTime: k.estimatedDeliveryTime || 30,
          deliveryFee: k.deliveryFee || 30, deliveryRadius: k.deliveryRadius || 5,
          latitude: k.latitude || '', longitude: k.longitude || '',
        })
      })
      .catch(() => {}) // Kitchen may not exist yet
      .finally(() => setLoading(false))
  }, [])

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.city || !form.phone) { toast.error('Fill all required fields'); return }
    setSaving(true)
    try {
      await kitchenAPI.updateProfile({
        ...form,
        minOrderAmount: Number(form.minOrderAmount),
        estimatedDeliveryTime: Number(form.estimatedDeliveryTime),
        deliveryFee: Number(form.deliveryFee),
        deliveryRadius: Number(form.deliveryRadius),
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
      })
      toast.success('Kitchen profile saved! 🏪')
    } catch (error) { toast.error(error.response?.data?.message || 'Failed to save kitchen profile') }
    finally { setSaving(false) }
  }

  if (loading) return <div className="h-96 rounded-3xl shimmer" />

  const CUISINES = ['North Indian', 'South Indian', 'Chinese', 'Italian', 'Biryani', 'Fast Food', 'Healthy', 'Desserts', 'Continental', 'Multi-Cuisine']

  return (
    <div className="max-w-3xl space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">Kitchen Profile 🏪</h1>
        <p className="text-sm font-body text-gray-500 dark:text-gray-400">Set up your cloud kitchen details</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Cover image preview */}
        {form.coverImage && (
          <div className="relative h-36 rounded-3xl overflow-hidden">
            <img src={form.coverImage} alt="" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        )}

        <div className="card p-6 space-y-5">
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Basic Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Kitchen Name *</label>
              <input value={form.name} onChange={set('name')} className="input-field" placeholder="Ramesh's Home Kitchen" required />
            </div>
            <div>
              <label className="input-label">Cuisine Type</label>
              <select value={form.cuisineType} onChange={set('cuisineType')} className="input-field">
                <option value="">Select cuisine</option>
                {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={form.description} onChange={set('description')} className="input-field resize-none" rows={3} placeholder="Tell customers about your kitchen..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Logo Image URL</label>
              <input value={form.logoImage} onChange={set('logoImage')} className="input-field" placeholder="https://.../logo.jpg" />
            </div>
            <div>
              <label className="input-label">Cover Image URL</label>
              <input value={form.coverImage} onChange={set('coverImage')} className="input-field" placeholder="https://.../cover.jpg" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Location & Contact</h2>
          <div>
            <label className="input-label">Full Address</label>
            <textarea value={form.address} onChange={set('address')} className="input-field resize-none" rows={2} placeholder="House no, Street, Area..." />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="input-label">City *</label>
              <input value={form.city} onChange={set('city')} className="input-field" placeholder="Mumbai" required />
            </div>
            <div>
              <label className="input-label">Pincode</label>
              <input value={form.pincode} onChange={set('pincode')} className="input-field" placeholder="400001" />
            </div>
            <div>
              <label className="input-label">Phone *</label>
              <input value={form.phone} onChange={set('phone')} className="input-field" placeholder="+91 98765 43210" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Latitude (optional)</label>
              <input type="number" step="any" value={form.latitude} onChange={set('latitude')} className="input-field" placeholder="19.0760" />
            </div>
            <div>
              <label className="input-label">Longitude (optional)</label>
              <input type="number" step="any" value={form.longitude} onChange={set('longitude')} className="input-field" placeholder="72.8777" />
            </div>
          </div>
        </div>

        <div className="card p-6 space-y-5">
          <h2 className="font-display font-bold text-gray-900 dark:text-white">Operations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="input-label">Opening Time</label>
              <input type="time" value={form.openingTime} onChange={set('openingTime')} className="input-field" />
            </div>
            <div>
              <label className="input-label">Closing Time</label>
              <input type="time" value={form.closingTime} onChange={set('closingTime')} className="input-field" />
            </div>
            <div>
              <label className="input-label">Min Order (₹)</label>
              <input type="number" value={form.minOrderAmount} onChange={set('minOrderAmount')} className="input-field" min="0" />
            </div>
            <div>
              <label className="input-label">Delivery Fee (₹)</label>
              <input type="number" value={form.deliveryFee} onChange={set('deliveryFee')} className="input-field" min="0" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Est. Delivery Time (min)</label>
              <input type="number" value={form.estimatedDeliveryTime} onChange={set('estimatedDeliveryTime')} className="input-field" min="1" />
            </div>
            <div>
              <label className="input-label">Delivery Radius (km)</label>
              <input type="number" step="0.5" value={form.deliveryRadius} onChange={set('deliveryRadius')} className="input-field" min="1" />
            </div>
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 text-base">
          {saving ? <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : '💾 Save Kitchen Profile'}
        </button>
      </form>
    </div>
  )
}
