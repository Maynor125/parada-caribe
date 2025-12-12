"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@supabase/ssr"
import { Loader2, Plus, X } from "lucide-react"

interface Ingredient {
  id: string
  name: string
  unit: string
}

interface RecipeItem {
  ingredient_id: string
  quantity: number
}

export default function AddRecipeForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [loading, setLoading] = useState(false)
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([])
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: 0,
  })

  useEffect(() => {
    fetchIngredients()
  }, [])

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase.from("ingredients").select("id, name, unit").order("name")

      if (error) throw error
      setIngredients(data || [])
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === "price" ? Number.parseFloat(value) : value,
    }))
  }

  const addRecipeItem = () => {
    setRecipeItems([...recipeItems, { ingredient_id: "", quantity: 0 }])
  }

  const removeRecipeItem = (index: number) => {
    setRecipeItems(recipeItems.filter((_, i) => i !== index))
  }

  const updateRecipeItem = (index: number, ingredient_id: string, quantity: number) => {
    const updated = [...recipeItems]
    updated[index] = { ingredient_id, quantity }
    setRecipeItems(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre de la receta es obligatorio",
        variant: "destructive",
      })
      return
    }

    if (recipeItems.length === 0) {
      toast({
        title: "Error",
        description: "Agrega al menos un ingrediente",
        variant: "destructive",
      })
      return
    }

    setLoading(true)

    try {
      // Crear la receta
      const { data: recipe, error: recipeError } = await supabase
        .from("recipes")
        .insert([
          {
            name: formData.name,
            description: formData.description,
            price: formData.price,
          },
        ])
        .select()

      if (recipeError) throw recipeError

      const recipeId = recipe[0].id

      // Agregar los ingredientes a la receta
      const itemsToInsert = recipeItems
        .filter((item) => item.ingredient_id)
        .map((item) => ({
          recipe_id: recipeId,
          ingredient_id: item.ingredient_id,
          quantity: item.quantity,
        }))

      if (itemsToInsert.length > 0) {
        const { error: itemsError } = await supabase.from("recipe_items").insert(itemsToInsert)

        if (itemsError) throw itemsError
      }

      toast({
        title: "Éxito",
        description: `Receta "${formData.name}" creada correctamente`,
      })

      setFormData({ name: "", description: "", price: 0 })
      setRecipeItems([])
      onSuccess()
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

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-sm font-medium">Nombre del Plato</label>
        <Input
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="Ej: Pollo a la Parrilla"
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Descripción</label>
        <Input
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Descripción del plato"
        />
      </div>

      <div>
        <label className="text-sm font-medium">Precio</label>
        <Input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} />
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Ingredientes</label>
        {recipeItems.map((item, index) => (
          <div key={index} className="flex gap-2 items-end">
            <select
              value={item.ingredient_id}
              onChange={(e) => updateRecipeItem(index, e.target.value, item.quantity)}
              className="flex-1 px-3 py-2 border rounded-lg bg-background text-foreground"
            >
              <option value="">Selecciona un ingrediente</option>
              {ingredients.map((ing) => (
                <option key={ing.id} value={ing.id}>
                  {ing.name}
                </option>
              ))}
            </select>
            <Input
              type="number"
              step="0.01"
              value={item.quantity}
              onChange={(e) => updateRecipeItem(index, item.ingredient_id, Number.parseFloat(e.target.value) || 0)}
              placeholder="Cantidad"
              className="w-24"
            />
            <span className="text-sm text-muted-foreground w-16">
              {item.ingredient_id && ingredients.find((i) => i.id === item.ingredient_id)?.unit}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeRecipeItem(index)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addRecipeItem} className="w-full bg-transparent">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Ingrediente
        </Button>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Crear Receta
      </Button>
    </form>
  )
}
