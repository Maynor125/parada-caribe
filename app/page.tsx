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
import { toast } from "@/hooks/use-toast"

export default function Page() {
  const [initialLoading, setInitialLoading] = useState(true)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [activeCategory, setActiveCategory] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])

  const [cashBoxOpen, setCashBoxOpen] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const [updatingStock, setUpdatingStock] = useState(false)

  const logoUrl = "/iso-paradacaribe.png"

  const fetchInitialData = async () => {
    try {
      setInitialLoading(true)

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

      setProducts(transformedData)

      const uniqueCategories = Array.from(new Set(transformedData.map((p) => p.category))).sort()
      setCategories(uniqueCategories)
      if (uniqueCategories.length > 0) {
        setActiveCategory(uniqueCategories[0])
      }
    } catch (err) {
      console.error("[v0] Error loading data:", err)
      setError(err instanceof Error ? err.message : "Error al cargar datos")
    } finally {
      setInitialLoading(false)
    }
  }

 const updateProductStock = async (items: OrderItem[]) => {
  if (!supabaseClient) return

  setUpdatingStock(true)
  
  try {
    const updatedProducts = [...products]
    
    for (const item of items) {
      const productIndex = updatedProducts.findIndex((p) => p.id === item.product_id)
      
      if (productIndex !== -1) {
        // Descontar stock para TODOS los productos, independientemente de si tienen receta o no
        const currentStock = updatedProducts[productIndex].current_stock
        const newStock = currentStock - item.quantity
        
        updatedProducts[productIndex] = {
          ...updatedProducts[productIndex],
          current_stock: Math.max(0, newStock)
        }
        
        // Actualizar en base de datos
        supabaseClient
          .from("products")
          .update({ current_stock: Math.max(0, newStock) })
          .eq("id", item.product_id)
          .then(({ error }: any) => {
            if (error) {
              console.error(`[v0] Error actualizando stock de ${item.product_name}:`, error)
            }
          })
          .catch((err: any) => {
            console.error(`[v0] Error en actualización de stock:`, err)
          })
      }
    }
    
    setProducts(updatedProducts)
    
  } catch (err) {
    console.error("[v0] Error descontando stock:", err)
  } finally {
    setUpdatingStock(false)
  }
}

  useEffect(() => {
    fetchInitialData()
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
  if (!supabaseClient || !currentSession) return null

  try {
    // Calcular número de pedido basado en el total de órdenes
    const updatedTotalOrders = (currentSession.total_orders || 0) + 1
    const orderNumber = updatedTotalOrders
    
    // Guardar la orden (sin order_number en la BD)
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

    if (orderError) {
      console.error("[v0] Error insertando orden:", orderError)
      throw orderError
    }

    // Actualizar sesión de caja
    const updatedTotalSales = (currentSession.total_sales || 0) + total
    
    const { error: updateError } = await supabaseClient
      .from("cash_sessions")
      .update({
        total_orders: updatedTotalOrders,
        total_sales: updatedTotalSales,
      })
      .eq("id", currentSession.id)

    if (updateError) {
      console.error("[v0] Error actualizando sesión:", updateError)
    }

    // Actualizar la sesión local
    setCurrentSession({
      ...currentSession,
      total_orders: updatedTotalOrders,
      total_sales: updatedTotalSales,
    })

    console.log("[v0] Orden guardada. Número de pedido:", orderNumber)
    
    // Retornar la orden con el número calculado (no viene de la BD)
    const savedOrder = orderData ? orderData[0] : null
    return savedOrder ? { 
      ...savedOrder, 
      order_number: orderNumber,
      order_number_formatted: orderNumber.toString().padStart(3, '0')
    } : null
    
  } catch (err: any) {
    console.error("[v0] Error guardando orden:", err)
    return null
  }
}

const handlePrint = async () => {
  const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0)

  // Guardar la orden y obtener el número de pedido
  const savedOrder = await saveOrderToDatabase(orderItems, total)
  
  if (savedOrder) {
    updateProductStock(orderItems)

    // Usar el número de pedido de la sesión
    const orderNumber = savedOrder.order_number_formatted || "001"

    const itemsHTML = orderItems
      .map(
        (item) =>
          `<tr>
            <td style="padding: 6px 4px; border-bottom: 1px solid #ddd; width: 55%; word-wrap: break-word;">${item.product_name}</td>
            <td style="padding: 6px 4px; border-bottom: 1px solid #ddd; text-align: center; width: 15%;">x${item.quantity}</td>
            <td style="padding: 6px 4px; border-bottom: 1px solid #ddd; text-align: right; width: 30%; padding-right: 8px;">$${(
              item.price * item.quantity
            ).toFixed(2)}</td>
          </tr>`,
      )
      .join("")

    // URL del logo
    const logoUrl = "/iso-paradacaribe.png"
    
    // Formatear fecha y hora con AM/PM
    const now = new Date()
    const fecha = now.toLocaleDateString("es-ES", {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).replace(/\./g, '') // Quitar puntos
    
    const hora = now.toLocaleTimeString("es-ES", {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true // Esto hace que muestre AM/PM
    })

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Parada Caribe - Pedido ${orderNumber}</title>
          <meta charset="utf-8">
          <style>
            @media print {
              @page {
                margin: 5mm;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
            }
            
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 10px; 
              background-color: #f5f5f5;
              margin: 0;
            }
            
            .voucher { 
              background-color: white; 
              border: 3px solid #8B6F47; 
              border-radius: 6px;
              padding: 15px; 
              width: 100%;
              max-width: 480px;
              margin: 10px auto;
              box-shadow: 0 4px 8px rgba(0,0,0,0.15);
              box-sizing: border-box;
            }
            
            .header { 
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 12px;
              margin-bottom: 15px;
              padding-bottom: 10px;
              border-bottom: 2px solid #8B6F47;
              width: 100%;
            }
            
            .logo-img {
              width: 70px;
              height: 70px;
              object-fit: contain;
              flex-shrink: 0;
            }
            
            .header-text {
              text-align: center;
              flex: 1;
            }
            
            .header h1 { 
              color: #8B6F47; 
              margin: 0 0 4px 0; 
              font-size: 24px;
              font-weight: bold;
              letter-spacing: 0.5px;
              line-height: 1.2;
              text-align: center;
            }
            
            .header p { 
              color: #666; 
              margin: 0; 
              font-size: 12px;
              font-style: italic;
              line-height: 1.3;
              text-align: center;
            }
            
            .order-number-display {
              text-align: center;
              margin: 10px 0 15px 0;
              padding: 8px;
              background-color: #8B6F47;
              color: white;
              border-radius: 4px;
              font-size: 18px;
              font-weight: bold;
              letter-spacing: 1px;
            }
            
            .order-info {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              font-size: 11px;
              color: #555;
              padding: 8px 10px;
              background-color: #f9f9f9;
              border-radius: 4px;
              border: 1px solid #eee;
              flex-wrap: wrap;
              gap: 5px;
            }
            
            .order-info > div {
              flex: 1;
              min-width: 80px;
              text-align: center;
            }
            
            .time-display {
              font-size: 11px;
              color: #555;
              font-weight: normal;
            }
            
            .time-display span {
              font-weight: bold;
              color: #8B6F47;
            }
            
            .items { 
              margin: 15px 0; 
            }
            
            table { 
              width: 100%; 
              border-collapse: collapse;
              table-layout: fixed;
            }
            
            th { 
              text-align: left; 
              font-weight: bold; 
              border-bottom: 2px solid #8B6F47; 
              padding: 8px 4px;
              font-size: 12px;
              background-color: #f9f9f9;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            th:last-child {
              padding-right: 8px;
            }
            
            td {
              padding: 6px 4px;
              border-bottom: 1px solid #ddd;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            
            td:last-child {
              padding-right: 8px;
            }
            
            .total { 
              font-size: 18px; 
              font-weight: bold; 
              text-align: right; 
              margin-top: 20px;
              padding-top: 15px;
              border-top: 2px solid #8B6F47;
              color: #8B6F47;
              padding-right: 8px;
            }
            
            .footer { 
              text-align: center; 
              margin-top: 20px; 
              font-size: 10px; 
              color: #666;
              border-top: 1px dashed #999;
              padding-top: 10px;
              line-height: 1.4;
            }
            
            /* Ajustes para impresión */
            @media print {
              .voucher {
                box-shadow: none;
                margin: 0 auto;
                max-width: 100%;
                padding: 12px;
                border: 2px solid #8B6F47;
                width: 100%;
              }
              
              body {
                background-color: white;
                padding: 0;
                width: 100%;
              }
              
              .logo-img {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              .order-number-display {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
              }
              
              table {
                width: 100%;
              }
              
              .total {
                padding-right: 8px;
              }
            }
          </style>
        </head>
        <body>
          <!-- Un solo voucher -->
          <div class="voucher">
            <div class="header">
              <img src="${logoUrl}" class="logo-img" alt="Parada Caribe Logo">
              <div class="header-text">
                <h1>PARADA CARIBE</h1>
                <p>Tu sabor caribeño favorito</p>
              </div>
            </div>
            
            <!-- Número de pedido destacado -->
            <div class="order-number-display">
              PEDIDO N° ${orderNumber}
            </div>
            
            <div class="order-info">
              <div>
                <strong>Fecha:</strong><br>
                ${fecha}
              </div>
              <div>
                <strong>Hora:</strong><br>
                ${hora}
              </div>
            </div>
            
            <div class="items">
              <table>
                <thead>
                  <tr>
                    <th style="width: 55%; text-align: left;">PRODUCTO</th>
                    <th style="width: 15%; text-align: center;">CANT</th>
                    <th style="width: 30%; text-align: right;">TOTAL</th>
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
              <p>¡Gracias por tu preferencia!</p>
              <p>Tu pedido está listo cuando escuches el número: <strong>${orderNumber}</strong></p>
            </div>
          </div>
          
          <script>
            // Script para cargar la imagen correctamente
            document.addEventListener('DOMContentLoaded', function() {
              var img = document.querySelector('.logo-img');
              if (img) {
                // Si la imagen no carga, intentar con ruta absoluta
                img.onerror = function() {
                  var currentPath = window.location.origin + '${logoUrl}';
                  if (this.src !== currentPath) {
                    this.src = currentPath;
                  }
                };
              }
            });
          </script>
        </body>
      </html>
    `

    const printWindow = window.open("", "", "width=520,height=800")
    if (printWindow) {
      printWindow.document.write(printContent)
      printWindow.document.close()
      
      handleClearOrder()
      
      // Esperar a que se carguen los estilos antes de imprimir
      setTimeout(() => {
        printWindow.focus()
        printWindow.print()
        // Cerrar la ventana después de imprimir
        setTimeout(() => {
          printWindow.close()
        }, 100)
      }, 300)
    } else {
      handleClearOrder()
      alert("Por favor permite ventanas emergentes para imprimir el voucher")
    }
  } else {
    // Mostrar error si no se pudo guardar
    toast({
      title: "Error",
      description: "No se pudo guardar la orden. Intente nuevamente.",
      variant: "destructive",
    })
  }
}
  if (initialLoading) {
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
          <div className="flex gap-3">
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
              {updatingStock && (
                <div className="mb-4 p-2 bg-blue-50 text-blue-700 text-sm rounded text-center">
                  Actualizando stock...
                </div>
              )}
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