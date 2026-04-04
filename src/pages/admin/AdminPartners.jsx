import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { Modal, ConfirmModal, EmptyState, FormInput } from '../../components/common/index'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdminPartners() {
  const [partners, setPartners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', vehicleType: 'BIKE', vehicleNumber: '' })
  const [search, setSearch] = useState('')

  const fetch = () => {
    adminAPI.getDeliveryPartners()
      .then(r => setPartners(r.data))
      .catch(() => toast.error('Failed to load partners'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await adminAPI.createDeliveryPartner(form)
      toast.success(`✅ Delivery partner created!\nEmail: ${form.email}\nPassword: ${form.password}`)
      setShowCreate(false)
      setForm({ name: '', email: '', password: '', phone: '', vehicleType: 'BIKE', vehicleNumber: '' })
      fetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create') }
  }

  const handleToggle = async (id) => {
    try { await adminAPI.toggleDeliveryPartnerStatus(id); toast.success('Status updated'); fetch() }
    catch { toast.error('Failed') }
  }

  const filtered = partners.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Delivery Partners 🛵</h1>
          <p className="text-sm font-body text-gray-500 dark:text-gray-400">{partners.length} registered partners</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span>➕</span> Add Partner
        </button>
      </div>

      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search partners..." className="input-field pl-10" />
      </div>

      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="🛵" title="No delivery partners yet"
            message="Add delivery partners to handle order deliveries."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">Add First Partner</button>} />
        ) : (
          <table className="w-full">
            <thead className="bg-orange-50 dark:bg-brand-dark-border">
              <tr>{['Partner', 'Email', 'Phone', 'Vehicle', 'Availability', 'Status', 'Joined', 'Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-body font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{h}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-orange-50 dark:divide-brand-dark-border">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-orange-50/50 dark:hover:bg-brand-dark-border/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {p.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-body font-semibold text-gray-900 dark:text-white text-sm">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-gray-600 dark:text-gray-400">{p.email}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-600 dark:text-gray-400">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-600 dark:text-gray-400">
                    {p.vehicleType || '—'} {p.vehicleNumber ? `(${p.vehicleNumber})` : ''}
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.isAvailable ? 'badge-active' : 'badge-inactive'}>
                      {p.isAvailable ? '🟢 Available' : '🔴 Offline'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={p.isActive ? 'badge-active' : 'badge-inactive'}>
                      {p.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-body text-gray-400">{formatDate(p.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleToggle(p.id)}
                        className={`text-xs font-body font-bold px-3 py-1.5 rounded-lg transition-colors ${
                          p.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}>
                        {p.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => setDeleteId(p.id)}
                        className="text-xs font-body font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Delivery Partner 🛵">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Full Name *" value={form.name} onChange={set('name')} placeholder="Arjun Kumar" required />
            <FormInput label="Phone *" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" required />
          </div>
          <FormInput label="Email *" type="email" value={form.email} onChange={set('email')} placeholder="arjun@delivery.com" required />
          <FormInput label="Password *" type="text" value={form.password} onChange={set('password')} placeholder="Set a strong password" required />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="input-label">Vehicle Type</label>
              <select value={form.vehicleType} onChange={set('vehicleType')} className="input-field">
                <option value="BIKE">Bike 🏍️</option>
                <option value="SCOOTER">Scooter 🛵</option>
                <option value="BICYCLE">Bicycle 🚲</option>
              </select>
            </div>
            <FormInput label="Vehicle Number" value={form.vehicleNumber} onChange={set('vehicleNumber')} placeholder="MH12AB1234" />
          </div>
          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
            <p className="text-xs font-body text-blue-600 dark:text-blue-400 font-semibold">
              📋 Share these credentials with the delivery partner for login access.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Partner</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)}
        onConfirm={async () => { await adminAPI.deleteUser(deleteId); toast.success('Partner deleted'); fetch() }}
        title="Delete Delivery Partner?" message="This will permanently remove the partner account."
        confirmText="Delete" danger />
    </div>
  )
}
