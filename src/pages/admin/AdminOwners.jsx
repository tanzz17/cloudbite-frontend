import { useState, useEffect } from 'react'
import { adminAPI } from '../../services/api'
import { Modal, ConfirmModal, EmptyState, FormInput } from '../../components/common/index'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function AdminOwners() {
  const [owners, setOwners] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editPassId, setEditPassId] = useState(null)
  const [deleteId, setDeleteId] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [newPass, setNewPass] = useState('')
  const [search, setSearch] = useState('')

  const fetch = () => {
    adminAPI.getKitchenOwners()
      .then(r => setOwners(r.data))
      .catch(() => toast.error('Failed to load owners'))
      .finally(() => setLoading(false))
  }
  useEffect(() => { fetch() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password || !form.phone) { toast.error('Fill all fields'); return }
    try {
      await adminAPI.createKitchenOwner(form)
      toast.success(`✅ Kitchen owner created! Share credentials:\nEmail: ${form.email}\nPassword: ${form.password}`)
      setShowCreate(false)
      setForm({ name: '', email: '', password: '', phone: '' })
      fetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create') }
  }

  const handleToggle = async (id) => {
    try {
      await adminAPI.toggleKitchenOwnerStatus(id)
      toast.success('Status updated')
      fetch()
    } catch { toast.error('Failed to update status') }
  }

  const handleUpdatePass = async () => {
    if (!newPass || newPass.length < 6) { toast.error('Password must be at least 6 chars'); return }
    try {
      await adminAPI.updateUserPassword(editPassId, newPass)
      toast.success('Password updated')
      setEditPassId(null)
      setNewPass('')
    } catch { toast.error('Failed to update password') }
  }

  const handleDelete = async () => {
    try {
      await adminAPI.deleteUser(deleteId)
      toast.success('Owner deleted')
      fetch()
    } catch { toast.error('Failed to delete') }
  }

  const filtered = owners.filter(o =>
    o.name?.toLowerCase().includes(search.toLowerCase()) ||
    o.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title">Kitchen Owners 👨‍🍳</h1>
          <p className="text-sm font-body text-gray-500 dark:text-gray-400">{owners.length} registered owners</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <span>➕</span> Add Owner
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..."
          className="input-field pl-10" />
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        {loading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-xl shimmer" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="👨‍🍳" title="No kitchen owners yet"
            message="Add kitchen owners and share their login credentials."
            action={<button onClick={() => setShowCreate(true)} className="btn-primary">Add First Owner</button>} />
        ) : (
          <table className="w-full">
            <thead className="bg-orange-50 dark:bg-brand-dark-border">
              <tr>
                {['Name', 'Email', 'Phone', 'Kitchen', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-body font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-orange-50 dark:divide-brand-dark-border">
              {filtered.map(owner => (
                <tr key={owner.id} className="hover:bg-orange-50/50 dark:hover:bg-brand-dark-border/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-orange-gradient flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                        {owner.name?.[0]?.toUpperCase()}
                      </div>
                      <span className="font-body font-semibold text-gray-900 dark:text-white text-sm">{owner.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-body text-gray-600 dark:text-gray-400">{owner.email}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-600 dark:text-gray-400">{owner.phone || '—'}</td>
                  <td className="px-4 py-3 text-sm font-body text-gray-600 dark:text-gray-400">
                    {owner.kitchen?.name || <span className="text-gray-400 italic">Not set up</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={owner.isActive ? 'badge-active' : 'badge-inactive'}>
                      {owner.isActive ? '✅ Active' : '❌ Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs font-body text-gray-400">{formatDate(owner.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => handleToggle(owner.id)}
                        className={`text-xs font-body font-bold px-3 py-1.5 rounded-lg transition-colors ${
                          owner.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}>
                        {owner.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => { setEditPassId(owner.id); setNewPass('') }}
                        className="text-xs font-body font-bold px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
                        🔑 Pass
                      </button>
                      <button onClick={() => setDeleteId(owner.id)}
                        className="text-xs font-body font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Add Kitchen Owner 👨‍🍳">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Full Name *" value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Chef Ramesh" required />
            <FormInput label="Phone *" value={form.phone} onChange={e => setForm(p => ({...p, phone: e.target.value}))} placeholder="+91 98765 43210" required />
          </div>
          <FormInput label="Email *" type="email" value={form.email} onChange={e => setForm(p => ({...p, email: e.target.value}))} placeholder="ramesh@kitchen.com" required />
          <FormInput label="Password *" type="text" value={form.password} onChange={e => setForm(p => ({...p, password: e.target.value}))} placeholder="Set a strong password" required />
          <div className="p-3 bg-orange-50 dark:bg-brand-dark-border rounded-xl">
            <p className="text-xs font-body text-orange-600 dark:text-orange-400 font-semibold">
              📋 After creating, share these credentials with the kitchen owner. They can log in at <strong>CloudBite</strong> using these details.
            </p>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Create Owner</button>
          </div>
        </form>
      </Modal>

      {/* Update Password Modal */}
      <Modal isOpen={!!editPassId} onClose={() => setEditPassId(null)} title="Update Password 🔑" size="sm">
        <div className="space-y-4">
          <FormInput label="New Password" type="text" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Enter new password" />
          <div className="flex gap-3">
            <button onClick={() => setEditPassId(null)} className="btn-ghost flex-1">Cancel</button>
            <button onClick={handleUpdatePass} className="btn-primary flex-1">Update</button>
          </div>
        </div>
      </Modal>

      <ConfirmModal isOpen={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Delete Kitchen Owner?" message="This will permanently delete the account. This action cannot be undone."
        confirmText="Delete" danger />
    </div>
  )
}
