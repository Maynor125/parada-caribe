"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface Recipe {
  id: string
  name: string
  price: number
}

interface RecipeItem {
  ingredient_id: string
  quantity: number
  ingredients: { id: string; name: string; unit: string; current_quantity: number }
}

export default function OrderPreparationPage() {
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [selectedRecipe, setSelectedRecipe] = useState<string>("")
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(true)
  const [preparing, setPreparing] = useState(false)

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from("recipes")
        .select("id, name, price")
        .eq("is_active", true)
        .order("name")

      if (error) throw error
      setRecipes(data || [])
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

  const fetchRecipeDetails = async (recipeId: string) => {
    try {
      const { data, error } = await supabase
        .from("recipe_items")
        .select("ingredient_id, quantity, ingredients(id, name, unit, current_quantity)")
        .eq("recipe_id", recipeId)

      if (error) throw error
      setRecipeItems(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleRecipeChange = (recipeId: string) => {
    setSelectedRecipe(recipeId)
    setQuantity(1)
    if (recipeId) {
      fetchRecipeDetails(recipeId)
    } else {
      setRecipeItems([])
    }
  }

  const handlePrepareOrder = async () => {
    if (!selectedRecipe || quantity < 1) {
      toast({
        title: "Error",
        description: "Selecciona una receta y cantidad válida",
        variant: "destructive",
      })
      return
    }

    setPreparing(true)

    try {
      // Verificar que hay suficiente inventario
      for (const item of recipeItems) {
        const requiredQuantity = item.quantity * quantity
        if (item.ingredients.current_quantity < requiredQuantity) {
          throw new Error(
            `Stock insuficiente de ${item.ingredients.name}. Necesitas ${requiredQuantity} y tienes ${item.ingredients.current_quantity}`,
          )
        }
      }

      // Descontar ingredientes
      for (const item of recipeItems) {
        const newQuantity = item.ingredients.current_quantity - item.quantity * quantity

        await supabase.from("ingredients").update({ current_quantity: newQuantity }).eq("id", item.ingredients.id)

        // Registrar en el log
        await supabase.from("inventory_logs").insert({
          ingredient_id: item.ingredients.id,
          movement_type: "recipe_used",
          quantity: item.quantity * quantity,
          recipe_id: selectedRecipe,
          notes: `Orden preparada (${quantity} unidad(es))`,
        })
      }

      toast({
        title: "Éxito",
        description: `Orden de ${quantity} ${recipes.find((r) => r.id === selectedRecipe)?.name || "plato(s)"} preparada. Inventario actualizado.`,
      })

      setSelectedRecipe("")
      setQuantity(1)
      setRecipeItems([])
      fetchRecipes() // Refresca para ver cambios
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setPreparing(false)
    }
  }

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Preparar Orden</CardTitle>
          <CardDescription>Prepara un plato y descuenta automáticamente los insumos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Selecciona un Plato</label>
            <select
              value={selectedRecipe}
              onChange={(e) => handleRecipeChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-background text-foreground mt-2"
            >
              <option value="">-- Selecciona un plato --</option>
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.name} (${recipe.price.toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {selectedRecipe && (
            <>
              <div>
                <label className="text-sm font-medium">Cantidad</label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number.parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 border rounded-lg bg-background text-foreground mt-2"
                />
              </div>

              <Card className="bg-muted">
                <CardHeader>
                  <CardTitle className="text-base">Ingredientes a Descontar</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {recipeItems.map((item, idx) => {
                      const requiredQuantity = item.quantity * quantity
                      const hasEnough = item.ingredients.current_quantity >= requiredQuantity

                      return (
                        <li
                          key={idx}
                          className={`flex justify-between items-center p-2 rounded ${
                            hasEnough ? "" : "bg-destructive/10 border border-destructive"
                          }`}
                        >
                          <span>{item.ingredients.name}</span>
                          <div className="text-right text-sm">
                            <div className="font-medium">
                              {requiredQuantity} {item.ingredients.unit}
                            </div>
                            <div className="text-muted-foreground">
                              Disponible: {item.ingredients.current_quantity} {item.ingredients.unit}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </CardContent>
              </Card>

              <Button onClick={handlePrepareOrder} disabled={preparing} className="w-full" size="lg">
                {preparing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Preparar Orden
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
