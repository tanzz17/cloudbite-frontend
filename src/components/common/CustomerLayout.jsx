import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import GlobalNavbar from './GlobalNavbar'
import AddressModal from '../customer/AddressModal'
import { useAddress } from '../../context/AddressContext'

export default function CustomerLayout() {
  const user = localStorage.getItem('cloudbite_user') 
    ? JSON.parse(localStorage.getItem('cloudbite_user')) 
    : null

  if (user?.role !== 'CUSTOMER') {
    return <Navigate to="/" replace />
  }

  const [showAddressModal, setShowAddressModal] = useState(false)
  const { selectAddress, refreshAddresses } = useAddress()

  const handleAddressSelect = (address) => {
    selectAddress(address)
    refreshAddresses()
    setShowAddressModal(false)
  }

  return (
    <div className="min-h-screen bg-[#fdf8f0] dark:bg-[#0f0a05] transition-colors duration-300">
      <GlobalNavbar onAddressClick={() => setShowAddressModal(true)} />
      <Outlet />
      <AddressModal
        isOpen={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSelect={handleAddressSelect}
      />
    </div>
  )
}
