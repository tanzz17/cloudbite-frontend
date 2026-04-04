import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { profileAPI } from '../../services/api'
import { formatDate } from '../../utils/helpers'
import toast from 'react-hot-toast'

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || '',
    profileImage: user?.profileImage || '',
    vehicleType: user?.vehicleType || '',
    vehicleNumber: user?.vehicleNumber || '',
  })
  const [passForm, setPassForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' })
  const [saving, setSaving] = useState(false)
  const [savingPass, setSavingPass] = useState(false)
  const [tab, setTab] = useState('profile')

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const setPass = (k) => (e) => setPassForm(p => ({ ...p, [k]: e.target.value }))

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await profileAPI.updateProfile(form)
      updateUser({ ...user, ...form })
      toast.success('Profile updated! ✅')
    } catch { toast.error('Failed to update profile') }
    finally { setSaving(false) }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passForm.newPassword !== passForm.confirmPassword) { toast.error('Passwords do not match'); return }
    if (passForm.newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setSavingPass(true)
    try {
      await profileAPI.changePassword({ oldPassword: passForm.oldPassword, newPassword: passForm.newPassword })
      toast.success('Password changed successfully!')
      setPassForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to change password') }
    finally { setSavingPass(false) }
  }

  const roleLabel = { ADMIN: 'Admin', KITCHEN_OWNER: 'Kitchen Owner', CUSTOMER: 'Customer', DELIVERY_PARTNER: 'Delivery Partner' }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="section-title">My Profile 👤</h1>
        <p className="text-sm font-body text-gray-500 dark:text-gray-400">Manage your account information</p>
      </div>

      {/* Profile header */}
      <div className="card p-6 flex items-center gap-4">
        <div className="w-20 h-20 rounded-2xl bg-orange-gradient flex items-center justify-center text-white font-bold text-3xl overflow-hidden flex-shrink-0">
          {form.profileImage
            ? <img src={form.profileImage} alt="" className="w-full h-full object-cover" />
            : user?.name?.[0]?.toUpperCase()}
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">{user?.name}</h2>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="badge bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400">
              {roleLabel[user?.role] || user?.role}
            </span>
            <span className={`badge ${user?.isActive ? 'badge-active' : 'badge-inactive'}`}>
              {user?.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{ key: 'profile', label: 'Profile Info', icon: '👤' }, { key: 'security', label: 'Security', icon: '🔒' }].map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-body font-bold text-sm transition-all ${
              tab === key ? 'bg-orange-gradient text-white shadow-orange' : 'bg-white dark:bg-brand-dark-card text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-brand-dark-border'
            }`}>
            <span>{icon}</span><span>{label}</span>
          </button>
        ))}
      </div>

      {tab === 'profile' ? (
        <div className="card p-6">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="input-label">Full Name</label>
                <input value={form.name} onChange={set('name')} className="input-field" placeholder="Your full name" />
              </div>
              <div>
                <label className="input-label">Phone Number</label>
                <input value={form.phone} onChange={set('phone')} className="input-field" placeholder="+91 98765 43210" />
              </div>
            </div>

            <div>
              <label className="input-label">Email Address</label>
              <input value={user?.email} className="input-field opacity-60 cursor-not-allowed" disabled />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="input-label">Profile Image URL</label>
              <input value={form.profileImage} onChange={set('profileImage')} className="input-field" placeholder="https://your-image-url.com/photo.jpg" />
            </div>

            {user?.role !== 'ADMIN' && (
              <div>
                <label className="input-label">Delivery Address</label>
                <textarea value={form.address} onChange={set('address')} className="input-field resize-none" rows={3} placeholder="Your full address..." />
              </div>
            )}

            {user?.role === 'DELIVERY_PARTNER' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="input-label">Vehicle Type</label>
                  <select value={form.vehicleType} onChange={set('vehicleType')} className="input-field">
                    <option value="">Select vehicle</option>
                    <option value="BIKE">Bike 🏍️</option>
                    <option value="SCOOTER">Scooter 🛵</option>
                    <option value="BICYCLE">Bicycle 🚲</option>
                  </select>
                </div>
                <div>
                  <label className="input-label">Vehicle Number</label>
                  <input value={form.vehicleNumber} onChange={set('vehicleNumber')} className="input-field" placeholder="MH12AB1234" />
                </div>
              </div>
            )}

            <button type="submit" disabled={saving} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-8">
              {saving ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : '💾 Save Changes'}
            </button>
          </form>
        </div>
      ) : (
        <div className="card p-6">
          <h3 className="font-display font-bold text-gray-900 dark:text-white mb-4">Change Password 🔒</h3>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="input-label">Current Password</label>
              <input type="password" value={passForm.oldPassword} onChange={setPass('oldPassword')} className="input-field" placeholder="Your current password" required />
            </div>
            <div>
              <label className="input-label">New Password</label>
              <input type="password" value={passForm.newPassword} onChange={setPass('newPassword')} className="input-field" placeholder="Min. 6 characters" required minLength={6} />
            </div>
            <div>
              <label className="input-label">Confirm New Password</label>
              <input type="password" value={passForm.confirmPassword} onChange={setPass('confirmPassword')} className="input-field" placeholder="Repeat new password" required />
            </div>
            <button type="submit" disabled={savingPass} className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto px-8">
              {savingPass ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</> : '🔒 Update Password'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
