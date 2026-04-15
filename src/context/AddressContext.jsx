import { createContext, useContext, useState, useEffect } from 'react'
import { customerAPI } from '../services/api'

const AddressContext = createContext()

export function AddressProvider({ children }) {
  const [selectedAddress, setSelectedAddress] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [loading, setLoading] = useState(true)

  const userRole = localStorage.getItem('cloudbite_user') 
    ? JSON.parse(localStorage.getItem('cloudbite_user'))?.role 
    : null
  const isCustomer = userRole === 'CUSTOMER'

  useEffect(() => {
    if (isCustomer) {
      loadDefaultAddress()
      loadAddresses()
    } else {
      setLoading(false)
    }
  }, [])

  const loadDefaultAddress = async () => {
    try {
      const { data } = await customerAPI.getDefaultAddress()
      if (data) {
        setSelectedAddress({
          ...data,
          fullAddress: data.fullAddress,
        })
      }
    } catch (err) {
      console.log('No default address')
    }
  }

  const loadAddresses = async () => {
    try {
      const { data } = await customerAPI.getAddresses()
      setAddresses(data)
    } catch (err) {
      console.error('Failed to load addresses:', err)
    } finally {
      setLoading(false)
    }
  }

  const selectAddress = (address) => {
    setSelectedAddress(address)
  }

  const refreshAddresses = () => {
    loadAddresses()
  }

  return (
    <AddressContext.Provider value={{
      selectedAddress,
      selectAddress,
      addresses,
      loading,
      refreshAddresses,
    }}>
      {children}
    </AddressContext.Provider>
  )
}

export const useAddress = () => {
  const context = useContext(AddressContext)
  if (!context) {
    throw new Error('useAddress must be used within AddressProvider')
  }
  return context
}
