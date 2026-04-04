import { createContext, useContext, useState, useEffect } from 'react'
import { customerAPI } from '../services/api'
import { useAuth } from './AuthContext'

const CartContext = createContext(null)

export const CartProvider = ({ children }) => {
  const { user } = useAuth()
  const [cart, setCart] = useState(null)
  const [cartCount, setCartCount] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (user?.role === 'CUSTOMER') fetchCart()
    else { setCart(null); setCartCount(0) }
  }, [user])

  useEffect(() => {
    const count = cart?.items?.reduce((sum, i) => sum + i.quantity, 0) || 0
    setCartCount(count)
  }, [cart])

  const fetchCart = async () => {
    try {
      setLoading(true)
      const { data } = await customerAPI.getCart()
      setCart(data)
    } catch {
      setCart(null)
    } finally {
      setLoading(false)
    }
  }

  const addToCart = async (menuItemId, quantity = 1, specialInstructions = '') => {
    const { data } = await customerAPI.addToCart({ menuItemId, quantity, specialInstructions })
    setCart(data)
    return data
  }

  const updateItem = async (cartItemId, quantity) => {
    const { data } = await customerAPI.updateCartItem(cartItemId, quantity)
    setCart(data)
    return data
  }

  const clearCart = async () => {
    await customerAPI.clearCart()
    setCart(null)
  }

  const getTotal = () => {
    return cart?.items?.reduce((sum, i) => sum + (i.menuItem?.price || 0) * i.quantity, 0) || 0
  }

  return (
    <CartContext.Provider value={{ cart, cartCount, loading, fetchCart, addToCart, updateItem, clearCart, getTotal }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside CartProvider')
  return ctx
}
