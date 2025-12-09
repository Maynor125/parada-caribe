"use client"

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import CashBoxHeader from "@/components/cash-box-header"
import Image from "next/image"
import logoParadaCaribe from "../../public/iso-paradacaribe.png";

export default function SummaryPage() {
  const [loading, setLoading] = useState(true)
  const [cashBoxOpen, setCashBoxOpen] = useState(false)
  const [currentSession, setCurrentSession] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [supabaseClient, setSupabaseClient] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)

      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        throw new Error("Environment variables not set")
      }

      const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
      setSupabaseClient(supabase)

      // Check for existing cash sessions
      try {
        const { data: sessions, error: sessionsError } = await supabase
          .from("cash_sessions")
          .select("*")
          .is("closed_at", null)
          .order("opened_at", { ascending: false })
          .limit(1)

        if (sessionsError && sessionsError.code !== "PGRST116") throw sessionsError

        if (sessions && sessions.length > 0) {
          setCurrentSession(sessions[0])
          setCashBoxOpen(true)

          // Fetch orders for this session
          const { data: ordersData, error: ordersError } = await supabase
            .from("orders")
            .select("*")
            .eq("cash_session_id", sessions[0].id)
            .order("created_at", { ascending: false })

          if (ordersError && ordersError.code !== "PGRST116") throw ordersError

          setOrders(ordersData || [])
        }
      } catch (e: any) {
        if (e.code !== "PGRST116") {
          console.error("[v0] Error loading cash sessions:", e)
        }
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

  const handleOpenCash = async (openingBalance: number) => {
    if (!supabaseClient) return

    try {
      const { data, error } = await supabaseClient
        .from("cash_sessions")
        .insert([
          {
            opening_balance: openingBalance,
            total_sales: 0,
            total_orders: 0,
          },
        ])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setCurrentSession(data[0])
        setCashBoxOpen(true)
        setOrders([])
      }
    } catch (err) {
      console.error("[v0] Error opening cash:", err)
    }
  }

  const handleCloseCash = async (closingBalance: number) => {
    if (!supabaseClient || !currentSession) return

    try {
      const { error } = await supabaseClient
        .from("cash_sessions")
        .update({
          closed_at: new Date(),
          closing_balance: closingBalance,
        })
        .eq("id", currentSession.id)

      if (error) throw error

      setCashBoxOpen(false)
      setCurrentSession(null)
      setOrders([])
      alert("Caja cerrada exitosamente")
    } catch (err) {
      console.error("[v0] Error closing cash:", err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 text-4xl">🏝️</div>
          <p className="text-xl font-bold text-foreground">Cargando resumen...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-bold text-red-600">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with navigation */}
        <div className="mb-8 flex items-center justify-between">
          <div className="flex">
            <Image
                          src={logoParadaCaribe}
                          alt="Descripción"
                          width={65}
                          height={65}
                          className="w-20 h-20"
                        />
                        <div className="">
                           <h1 className="text-4xl md:text-5xl font-bold text-primary mb-2"> PARADA CARIBE</h1>
            <p className="text-lg text-muted-foreground">Resumen de Caja</p>
                        </div>
           
          </div>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 h-12 rounded-lg">
              📝 Crear Pedidos
            </Button>
          </Link>
        </div>

        {/* Cash Box Management */}
        <CashBoxHeader
          isOpen={cashBoxOpen}
          currentSession={currentSession}
          onOpenCash={handleOpenCash}
          onCloseCash={handleCloseCash}
        />

        {/* Orders List */}
        {cashBoxOpen && orders.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Detalle de Órdenes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-bold">Hora</th>
                      <th className="text-left py-3 px-4 font-bold">Productos</th>
                      <th className="text-right py-3 px-4 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => (
                      <tr key={index} className="border-b border-border hover:bg-muted/50">
                        <td className="py-3 px-4">{new Date(order.created_at).toLocaleTimeString("es-ES")}</td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {order.items &&
                              order.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  {item.product_name} x{item.quantity}
                                </div>
                              ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary">
                          ${Number(order.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {cashBoxOpen && orders.length === 0 && (
          <Card className="mt-8">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No hay órdenes registradas aún en esta sesión de caja</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
