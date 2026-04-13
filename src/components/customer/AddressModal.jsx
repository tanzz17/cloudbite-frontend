import { useState, useEffect } from 'react'
import { customerAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

const ADDRESS_LABELS = ['Home', 'Office', 'Friend\'s Place', 'Other']

export default function AddressModal({ isOpen, onClose, onSelect, currentAddress, showReceiverOption = true }) {
  const { user } = useAuth()
  const [addresses, setAddresses] = useState([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [gettingLocation, setGettingLocation] = useState(false)
  const [useMyAddress, setUseMyAddress] = useState(true)
  const [form, setForm] = useState({
    label: 'Home',
    fullAddress: '',
    receiverName: user?.name || '',
    receiverPhone: user?.phone || '',
    latitude: null,
    longitude: null,
  })

  useEffect(() => {
    if (isOpen) {
      fetchAddresses()
      setForm(f => ({ ...f, receiverName: user?.name || '', receiverPhone: user?.phone || '' }))
    }
  }, [isOpen, user])

  const fetchAddresses = async () => {
    try {
      const { data } = await customerAPI.getAddresses()
      setAddresses(data)
    } catch (err) {
      console.error('Failed to fetch addresses:', err)
    }
  }

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }

    setGettingLocation(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setForm(f => ({ ...f, latitude, longitude }))
        
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          )
          const data = await response.json()
          if (data.display_name) {
            setForm(f => ({ ...f, fullAddress: data.display_name }))
            toast.success('Location detected!')
          }
        } catch (err) {
          toast.error('Could not get address from location')
        }
        setGettingLocation(false)
      },
      (err) => {
        toast.error('Could not get your location. Please enable location access.')
        setGettingLocation(false)
      }
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!form.receiverName?.trim()) {
      toast.error('Please enter receiver name')
      return
    }
    if (!form.receiverPhone?.trim()) {
      toast.error('Please enter receiver phone number')
      return
    }
    if (!form.fullAddress?.trim()) {
      toast.error('Please enter your address')
      return
    }

    setLoading(true)
    try {
      const payload = {
        label: form.label,
        fullAddress: form.fullAddress,
        receiverName: form.receiverName,
        receiverPhone: form.receiverPhone,
        latitude: form.latitude || null,
        longitude: form.longitude || null,
      }
      await customerAPI.addAddress(payload)
      toast.success('Address saved!')
      setShowAddForm(false)
      setForm({ 
        label: 'Home', 
        fullAddress: '', 
        receiverName: user?.name || '', 
        receiverPhone: user?.phone || '',
        latitude: null, 
        longitude: null 
      })
      fetchAddresses()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save address')
    } finally {
      setLoading(false)
    }
  }

  const handleSelect = (address) => {
    const fullAddr = `${address.receiverName || user?.name || ''}, ${address.fullAddress}`
    onSelect({
      ...address,
      fullAddress: fullAddr,
      displayName: address.label,
    })
    onClose()
  }

  const handleSetDefault = async (address) => {
    try {
      await customerAPI.setDefaultAddress(address.id)
      toast.success('Default address updated')
      fetchAddresses()
    } catch (err) {
      toast.error('Failed to update default address')
    }
  }

  const handleDelete = async (address) => {
    if (!confirm('Delete this address?')) return
    try {
      await customerAPI.deleteAddress(address.id)
      toast.success('Address deleted')
      fetchAddresses()
    } catch (err) {
      toast.error('Failed to delete address')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-[#1a1108] rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-hidden animate-slide-up">
        <div className="p-6 border-b border-amber-100 dark:border-amber-900/40">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Select Delivery Address</h2>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xl hover:bg-amber-200 dark:hover:bg-amber-800 transition-colors">×</button>
          </div>
          <p className="font-body text-sm text-gray-500 dark:text-gray-400 mt-1">Choose or add a delivery address</p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-4">
          {!showAddForm ? (
            <>
              {/* Add New Address Button */}
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full p-4 border-2 border-dashed border-amber-300 dark:border-amber-700 rounded-2xl flex items-center gap-3 hover:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
              >
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-2xl">➕</div>
                <div className="text-left">
                  <p className="font-display font-bold text-gray-900 dark:text-white">Add New Address</p>
                  <p className="font-body text-xs text-gray-500 dark:text-gray-400">Enter your complete address</p>
                </div>
              </button>

              {/* Saved Addresses */}
              {addresses.length > 0 && (
                <div className="space-y-3">
                  <p className="font-body text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Saved Addresses</p>
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        addr.isDefault
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                          : 'border-amber-100 dark:border-amber-900/40 hover:border-amber-300'
                      }`}
                      onClick={() => handleSelect(addr)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl flex-shrink-0">
                          {addr.label === 'Home' ? '🏠' : addr.label === 'Office' ? '🏢' : '📍'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-display font-bold text-gray-900 dark:text-white">{addr.label}</p>
                              <p className="font-body text-xs text-gray-500">{addr.receiverName || user?.name}</p>
                            </div>
                            {addr.isDefault && (
                              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded-full">Default</span>
                            )}
                          </div>
                          <p className="font-body text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">{addr.fullAddress}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleSetDefault(addr) }}
                              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              Set as default
                            </button>
                            <span className="text-gray-300 dark:text-gray-600">•</span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDelete(addr) }}
                              className="text-xs font-bold text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="text-sm font-bold text-amber-600 dark:text-amber-400 hover:underline"
              >
                ← Back to saved addresses
              </button>

              {/* Receiver Info */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 space-y-3">
                <p className="font-display font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  👤 Delivery Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="input-label">Receiver's Name *</label>
                    <input
                      type="text"
                      value={form.receiverName}
                      onChange={(e) => setForm(f => ({ ...f, receiverName: e.target.value }))}
                      placeholder="Rahul Sharma"
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Phone Number *</label>
                    <input
                      type="tel"
                      value={form.receiverPhone}
                      onChange={(e) => setForm(f => ({ ...f, receiverPhone: e.target.value }))}
                      placeholder="+91 98765 43210"
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                {user && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useMyAddress}
                      onChange={(e) => {
                        setUseMyAddress(e.target.checked)
                        if (e.target.checked) {
                          setForm(f => ({ ...f, receiverName: user.name, receiverPhone: user.phone || '' }))
                        }
                      }}
                      className="w-4 h-4 rounded border-amber-300 text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-sm font-body text-gray-600 dark:text-gray-300">
                      Use my account details ({user.name})
                    </span>
                  </label>
                )}
              </div>

              {/* Address Label */}
              <div>
                <label className="input-label">Save as</label>
                <div className="flex gap-2 flex-wrap">
                  {ADDRESS_LABELS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, label }))}
                      className={`px-4 py-2 rounded-xl font-body font-bold text-sm transition-all ${
                        form.label === label
                          ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {label === 'Home' ? '🏠' : label === 'Office' ? '🏢' : '📍'} {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Full Address */}
              <div>
                <label className="input-label">Complete Address *</label>
                <textarea
                  value={form.fullAddress}
                  onChange={(e) => setForm(f => ({ ...f, fullAddress: e.target.value }))}
                  placeholder="House no, Street, Area, Landmark..."
                  className="input-field resize-none"
                  rows={3}
                  required
                />
              </div>

              {/* GPS Location */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-body font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-70"
                >
                  {gettingLocation ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Getting location...
                    </>
                  ) : (
                    <>
                      <span>📍</span> Use GPS Location
                    </>
                  )}
                </button>
                {form.latitude && (
                  <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    ✓ Location saved
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex items-center justify-center gap-2 py-4"
              >
                {loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span> Save Address
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
