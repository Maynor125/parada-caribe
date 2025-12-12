"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import CategoryTabs from "@/components/category-tabs"
import ProductList from "@/components/product-list"
import OrderSummary from "@/components/order-summary"
import type { Product, OrderItem } from "@/types"
import logoParadaCaribe from "../public/iso-paradacaribe.png"
import Image from "next/image"

export default function Page() {
  const [loading, setLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  const [cashBoxOpen, setCashBoxOpen] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [supabaseClient, setSupabaseClient] = useState<any>(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error(
          "Environment variables not set. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
        )
      }

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      setSupabaseClient(supabase)

      // Check for existing cash sessions if table exists
      try {
        const { data: sessions } = await supabase
          .from("cash_sessions")
          .select("*")
          .is("closed_at", null)
          .order("opened_at", { ascending: false })
          .limit(1)

        if (sessions && sessions.length > 0) {
          setCurrentSession(sessions[0])
          setCashBoxOpen(true)
        }
      } catch (e) {
        console.log("[v0] Cash sessions table not ready yet")
      }

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, price, category_id, current_stock, min_stock, recipe_id, categories(name)")
        .order("category_id")
        .order("name")

      if (productsError) {
        throw productsError
      }

      if (!productsData || productsData.length === 0) {
        console.log("[v0] No products found")
        setProducts([])
        setCategories([])
        return
      }

      console.log("[v0] Raw products:", productsData)

      const sortedData = productsData.sort((a: any, b: any) => {
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category)
        }
        return a.name.localeCompare(b.name)
      })

      const transformedData = sortedData.map((product: any) => ({
        id: product.id,
        name: product.name,
        price: product.price,
        current_stock: product.current_stock || 0,
        min_stock: product.min_stock || 0,
        recipe_id: product.recipe_id,
        category: product.categories.name || "Sin categoría",
      }))

      console.log("[v0] Transformed data:", transformedData)

      setProducts(transformedData)

      const uniqueCategories = Array.from(new Set(transformedData.map((p) => p.category))).sort()
      console.log("[v0] Unique categories:", uniqueCategories)

      setCategories(uniqueCategories)
      if (uniqueCategories.length > 0) {
        setActiveCategory(uniqueCategories[0])
        console.log("[v0] Active category set to:", uniqueCategories[0])
      }
    } catch (err) {
      console.error("[v0] Error loading data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredProducts = products.filter((p) => p.category === activeCategory)

  const handleAddProduct = (product: Product) => {
    if (!product.recipe_id && product.current_stock <= 0) {
      alert(`No hay stock disponible de ${product.name}`)
      return
    }

    const existingItem = orderItems.find((item) => item.product_id === product.id)

    if (existingItem) {
      if (!product.recipe_id && existingItem.quantity + 1 > product.current_stock) {
        alert(`Stock insuficiente. Solo quedan ${product.current_stock} unidades de ${product.name}`)
        return
      }

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

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) {
      handleRemoveItem(itemId)
      return
    }

    const item = orderItems.find((i) => i.id === itemId)
    if (item) {
      const product = products.find((p) => p.id === item.product_id)
      if (product && !product.recipe_id && quantity > product.current_stock) {
        alert(`Stock insuficiente. Solo quedan ${product.current_stock} unidades`)
        return
      }
    }

    setOrderItems(orderItems.map((item) => (item.id === itemId ? { ...item, quantity } : item)))
  }

  const handleRemoveItem = (itemId: string) => {
    setOrderItems(orderItems.filter((item) => item.id !== itemId))
  }

  const handleClearOrder = () => {
    setOrderItems([])
  }

  const saveOrderToDatabase = async (items: OrderItem[], total: number) => {
    if (!supabaseClient || !currentSession) return

    try {
      const { data: orderData, error: orderError } = await supabaseClient
        .from("orders")
        .insert([
          {
            cash_session_id: currentSession.id,
            items: items.map((item) => ({
              product_id: item.product_id,
              product_name: item.product_name,
              quantity: item.quantity,
              price: item.price,
            })),
            total: total,
          },
        ])
        .select()

      if (orderError) throw orderError

      const updatedTotalOrders = (currentSession.total_orders || 0) + 1
      const updatedTotalSales = (currentSession.total_sales || 0) + total

      const { error: updateError } = await supabaseClient
        .from("cash_sessions")
        .update({
          total_orders: updatedTotalOrders,
          total_sales: updatedTotalSales,
        })
        .eq("id", currentSession.id)

      if (updateError) throw updateError

      setCurrentSession({
        ...currentSession,
        total_orders: updatedTotalOrders,
        total_sales: updatedTotalSales,
      })

      console.log("[v0] Orden guardada:", orderData)
    } catch (err) {
      console.error("[v0] Error saving order:", err)
    }
  }

  const discountProductStock = async (items: OrderItem[]) => {
    if (!supabaseClient) return

    try {
      for (const item of items) {
        const product = products.find((p) => p.id === item.product_id)

        if (product && !product.recipe_id) {
          const newStock = product.current_stock - item.quantity

          const { error: stockError } = await supabaseClient
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", item.product_id)

          if (stockError) {
            console.error(`[v0] Error actualizando stock de ${item.product_name}:`, stockError)
            throw stockError
          }

          console.log(`[v0] Stock descontado: ${item.product_name} (${item.quantity} unidades)`)
        }
      }

      await fetchData()
    } catch (err) {
      console.error("[v0] Error descontando stock:", err)
      alert("Error al descontar stock. Verifica el inventario manualmente.")
    }
  }

  const handlePrint = async () => {
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

    await saveOrderToDatabase(orderItems, total)

    await discountProductStock(orderItems)

    const itemsHTML = orderItems
      .map(
        (item) =>
          `<tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">x${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${(
          item.price * item.quantity
        ).toFixed(2)}</td>
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
        handleClearOrder()
      }, 250)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center flex align-middle">
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
        <div className="mb-8 flex items-center justify-between">
          <div className="flex">
            <Image
              src={logoParadaCaribe || "/placeholder.svg"}
              alt="Descripción"
              width={65}
              height={65}
              className="w-20 h-20"
            />
            <div className="">
              <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2">PARADA CARIBE</h1>
              <p className="text-lg text-muted-foreground">Sistema de Pedidos</p>
            </div>
          </div>
          <Link href="/inventary">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 h-12 rounded-lg">
              Inventario
            </Button>
          </Link>
          <Link href="/summary">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 h-12 rounded-lg">
              📊 Resumen de Caja
            </Button>
          </Link>
        </div>

        {!cashBoxOpen && (
          <div className="text-center py-12 text-muted-foreground bg-red-50 border border-red-200 rounded-lg">
            <p className="text-lg font-bold">Abre la caja en el Resumen para comenzar a registrar pedidos</p>
            <Link href="/summary">
              <Button className="mt-4 bg-green-600 hover:bg-green-700">Ir a Resumen de Caja</Button>
            </Link>
          </div>
        )}

        {cashBoxOpen && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              {categories.length > 0 && (
                <CategoryTabs
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                />
              )}

              {filteredProducts.length > 0 ? (
                <ProductList products={filteredProducts} onAddProduct={handleAddProduct} />
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No hay productos en esta categoría</p>
                </div>
              )}
            </div>

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
        )}
      </div>
    </main>
  )
}
