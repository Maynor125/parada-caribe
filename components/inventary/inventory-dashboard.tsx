"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Package, TrendingDown, DollarSign } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
  current_quantity: number
  min_quantity: number
  cost_per_unit: number
}

export default function InventoryDashboard() {
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [stats, setStats] = useState({
    totalIngredients: 0,
    lowStockCount: 0,
    totalInventoryValue: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const { data, error } = await supabase.from("ingredients").select("*").order("name")

      if (error) throw error

      const ingredientList = data || []
      setIngredients(ingredientList)

      // Calcular estadísticas
      const lowStock = ingredientList.filter((ing) => ing.current_quantity <= ing.min_quantity)
      const totalValue = ingredientList.reduce((sum, ing) => sum + ing.current_quantity * ing.cost_per_unit, 0)

      setStats({
        totalIngredients: ingredientList.length,
        lowStockCount: lowStock.length,
        totalInventoryValue: totalValue,
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Ingredientes</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalIngredients}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo de ingedientes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.lowStockCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.totalInventoryValue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recetas Activas</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
          </CardContent>
        </Card>
      </div>

      {/* Ingredientes con bajo stock */}
      {stats.lowStockCount > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Ingredientes con Bajo Stock</CardTitle>
            <CardDescription>Estos ingredientes necesitan reorden</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ingredients
                .filter((ing) => ing.current_quantity <= ing.min_quantity)
                .map((ing) => (
                  <div key={ing.id} className="flex justify-between items-center p-3 rounded-lg bg-destructive/10">
                    <div>
                      <p className="font-medium">{ing.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {ing.current_quantity} / {ing.min_quantity} {ing.unit}
                      </p>
                    </div>
                    <AlertTriangle className="text-destructive" />
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
