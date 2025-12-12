"use client"

import { Fragment, useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, ChevronDown, Loader2 } from "lucide-react"
import { Switch } from "../ui/switch"

interface Recipe {
  id: string
  name: string
  description: string
  price: number
  is_active: boolean
}

interface RecipeItem {
  ingredient_id: string
  quantity: number
  ingredients: { name: string; unit: string }
}

export default function RecipesTable() {
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [expandedRecipe, setExpandedRecipe] = useState<string | null>(null)
  const [recipeDetails, setRecipeDetails] = useState<{ [key: string]: RecipeItem[] }>({})
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchRecipes()
  }, [])

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase.from("recipes").select("*").order("name")

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
        .select("ingredient_id, quantity, ingredients(name, unit)")
        .eq("recipe_id", recipeId)

      if (error) throw error

      const typedData: RecipeItem[] = (data || []).map((item: any) => ({
        ingredient_id: item.ingredient_id,
        quantity: item.quantity,
        ingredients: {
          name: item.ingredients?.name || "",
          unit: item.ingredients?.unit || "",
        },
      }))

      setRecipeDetails((prev) => ({
        ...prev,
        [recipeId]: typedData,
      }))
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar esta receta?")) {
    return
    }
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", id)

      if (error) throw error

      setRecipes(recipes.filter((r) => r.id !== id))
      toast({
        title: "Éxito",
        description: "Receta eliminada",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const toggleExpanded = (recipeId: string) => {
    if (expandedRecipe === recipeId) {
      setExpandedRecipe(null)
    } else {
      setExpandedRecipe(recipeId)
      if (!recipeDetails[recipeId]) {
        fetchRecipeDetails(recipeId)
      }
    }
  }

  const toggleActive = async (id: string, currentStatus: boolean) => {
  try {
    const { error } = await supabase
      .from("recipes")
      .update({ is_active: !currentStatus })
      .eq("id", id)

    if (error) throw error

    // Actualizar el estado local
    setRecipes(recipes.map(recipe => 
      recipe.id === id 
        ? { ...recipe, is_active: !currentStatus }
        : recipe
    ))

    toast({
      title: "Éxito",
      description: `Receta ${!currentStatus ? 'activada' : 'desactivada'}`,
    })
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message,
      variant: "destructive",
    })
  }
}

  if (loading) return <div>Cargando...</div>

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Precio</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {recipes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground py-4">
                No hay recetas registradas
              </TableCell>
            </TableRow>
          ) : (
            recipes.map((recipe) => (
              <Fragment key={recipe.id}>
                <TableRow>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => toggleExpanded(recipe.id)}>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${expandedRecipe === recipe.id ? "rotate-180" : ""}`}
                      />
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">{recipe.name}</TableCell>
                  <TableCell>${recipe.price.toFixed(2)}</TableCell>
                  <TableCell>{
                    <div className="flex items-center space-x-3">
                      {updatingId === recipe.id ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Actualizando...</span>
                        </div>
                      ) : (
                        <>
                          <Switch
                            checked={recipe.is_active}
                            onCheckedChange={() => toggleActive(recipe.id, recipe.is_active)}
                            disabled={updatingId !== null}
                          />
                          <span className={`text-sm font-medium ${recipe.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                            {recipe.is_active ? 'Activa' : 'Inactiva'}
                          </span>
                        </>
                      )}
                    </div>
                    }</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(recipe.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
                {expandedRecipe === recipe.id && recipeDetails[recipe.id] && (
                  <TableRow>
                    <TableCell colSpan={5} className="bg-muted/50 p-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold">Ingredientes:</h4>
                        <ul className="space-y-1 ml-4">
                          {recipeDetails[recipe.id].map((item: RecipeItem, idx: number) => (
                            <li key={idx} className="text-sm">
                              {item.ingredients.name}: {item.quantity} {item.ingredients.unit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
