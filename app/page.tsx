"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import CategoryTabs from "@/components/category-tabs"
import ProductList from "@/components/product-list"
import OrderSummary from "@/components/order-summary"
import type { Product, OrderItem } from "@/types"

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [activeCategory, setActiveCategory] = useState("Comida")
  const [error, setError] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  const fetchProducts = async () => {
    try {
      setLoading(true)

      console.log("[v0] URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)
      console.log("[v0] Key exists:", !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error(
          "Environment variables not set. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
        )
      }

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      console.log("[v0] Supabase client created successfully")

      console.log("[v0] Fetching products...")
      const { data, error: queryError } = await supabase
        .from("products")
        .select("id, name, price, category_id, categories(name)")
        .order("category_id")
        .order("name")

      console.log("[v0] Query error:", queryError)
      console.log("[v0] Data received:", data)

      if (queryError) {
        console.error("[v0] Query error details:", queryError)
        throw queryError
      }

      if (!data || data.length === 0) {
        console.warn("[v0] No products found in database")
        setProducts([])
        return
      }

      const transformedData = data.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        category_id: product.category_id,
        category: product.categories?.name || "Otros",
      }))

      console.log("[v0] First product:", transformedData[0])
      setProducts(transformedData)
      if (transformedData && transformedData.length > 0) {
        setActiveCategory(transformedData[0].category || "Comida")
      }
    } catch (err) {
      console.error("[v0] Error loading products:", err)
      setError(err instanceof Error ? err.message : JSON.stringify(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Get unique categories from products
  const categories = Array.from(new Set(products.map((p) => p.category)))

  // Filter products by active category
  const filteredProducts = products.filter((p) => p.category === activeCategory)

  // Handle adding product to order
  const handleAddProduct = (product: Product) => {
    const existingItem = orderItems.find((item) => item.product_id === product.id)

    if (existingItem) {
      setOrderItems(
        orderItems.map((item) => (item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item)),
      )
    } else {
      setOrderItems([
        ...orderItems,
        {
          id: `${product.id}-${Date.now()}`,
          product_id: product.id,
          product_name: product.name,
          price: Number(product.price),
          quantity: 1,
        },
      ])
    }
  }

  // Handle updating quantity
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(itemId)
      return
    }
    setOrderItems(orderItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
  }

  // Handle removing item
  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId))
  }

  // Handle clearing order
  const handleClearOrder = () => {
    setOrderItems([])
  }

  // Handle printing
  const handlePrint = () => {
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
    const itemsHTML = orderItems
      .map(
        (item) =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">x${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>`,
      )
      .join("")

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Parada Caribe - Voucher</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5; }
            .voucher { 
              background-color: white; 
              border: 3px solid #8B6F47; 
              border-radius: 8px;
              padding: 20px; 
              max-width: 400px; 
              margin: 20px auto;
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header { 
              text-align: center; 
              margin-bottom: 20px; 
              border-bottom: 2px solid #8B6F47;
              padding-bottom: 10px;
            }
            .header h1 { 
              color: #8B6F47; 
              margin: 0; 
              font-size: 24px;
            }
            .header p { 
              color: #666; 
              margin: 5px 0 0 0; 
              font-size: 12px;
            }
            .items { margin: 20px 0; }
            table { width: 100%; border-collapse: collapse; }
            th { text-align: left; font-weight: bold; border-bottom: 2px solid #8B6F47; padding: 8px; }
            .total { 
              font-size: 18px; 
              font-weight: bold; 
              text-align: right; 
              margin-top: 15px;
              padding-top: 15px;
              border-top: 2px solid #8B6F47;
              color: #8B6F47;
            }
            .footer { 
              text-align: center; 
              margin-top: 15px; 
              font-size: 12px; 
              color: #666;
              border-top: 1px dashed #999;
              padding-top: 10px;
            }
            .copy-label {
              text-align: center;
              font-weight: bold;
              color: #8B6F47;
              margin-bottom: 10px;
              font-size: 14px;
            }
            .page-break { page-break-after: always; }
          </style>
        </head>
        <body>
          <!-- Copia 1: Cliente -->
          <div class="voucher">
            <div class="copy-label">COPIA CLIENTE</div>
            <div class="header">
              <h1>🏝️ PARADA CARIBE</h1>
              <p>Tu sabor caribeño favorito</p>
            </div>
            <div class="items">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="text-align: right;">Cant</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>
            <div class="total">
              TOTAL: $${total.toFixed(2)}
            </div>
            <div class="footer">
              <p>Fecha: ${new Date().toLocaleString("es-ES")}</p>
              <p>¡Gracias por tu compra!</p>
            </div>
          </div>

          <!-- Salto de página -->
          <div class="page-break"></div>

          <!-- Copia 2: Negocio -->
          <div class="voucher">
            <div class="copy-label">COPIA NEGOCIO</div>
            <div class="header">
              <h1>🏝️ PARADA CARIBE</h1>
              <p>Tu sabor caribeño favorito</p>
            </div>
            <div class="items">
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="text-align: right;">Cant</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHTML}
                </tbody>
              </table>
            </div>
            <div class="total">
              TOTAL: $${total.toFixed(2)}
            </div>
            <div class="footer">
              <p>Fecha: ${new Date().toLocaleString("es-ES")}</p>
              <p>¡Gracias por tu compra!</p>
            </div>
          </div>
        </body>
      </html>
    `

    const printWindow = window.open("", "", "width=600,height=800")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 text-4xl">🏝️</div>
          <p className="text-xl font-bold text-foreground">Cargando productos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-bold text-red-600">Error: {error}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Verifica que Supabase esté conectado y las variables de entorno estén configuradas
          </p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">🏝️ PARADA CARIBE</h1>
          <p className="text-lg text-muted-foreground">Sistema de Pedidos</p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Products Section */}
          <div className="lg:col-span-2">
            {/* Category Tabs */}
            {categories.length > 0 && (
              <CategoryTabs
                categories={categories}
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            )}

            {/* Products Grid */}
            {filteredProducts.length > 0 ? (
              <ProductList products={filteredProducts} onAddProduct={handleAddProduct} />
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">No hay productos en esta categoría</p>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary
              items={orderItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemoveItem={handleRemoveItem}
              onClearOrder={handleClearOrder}
              onPrint={handlePrint}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
