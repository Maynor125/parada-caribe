export interface Product {
  id: string
  name: string
  price: number | string
  category: string
  created_at?: string
}

export interface OrderItem {
  id: string
  product_id: string
  product_name: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  created_at: string
  items: OrderItem[]
  total: number
}
