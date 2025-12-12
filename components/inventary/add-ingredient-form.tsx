"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createBrowserClient } from "@supabase/ssr"
import { Loader2 } from "lucide-react"

export default function AddIngredientForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unit: "kg",
    current_quantity: 0,
    min_quantity: 0,
    cost_per_unit: 0,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "current_quantity" || name === "min_quantity" || name === "cost_per_unit"
          ? Number.parseFloat(value)
          : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error } = await supabase.from("ingredients").insert([formData])

      if (error) throw error

      toast({
        title: "Éxito",
        description: `Ingrediente "${formData.name}" agregado correctamente`,
      })
      setFormData({
        name: "",
        description: "",
        unit: "kg",
        current_quantity: 0,
        min_quantity: 0,
        cost_per_unit: 0,
      })
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
        <label className="text-sm font-medium">Nombre del Ingrediente</label>
        <Input name="name" value={formData.name} onChange={handleChange} placeholder="Ej: Pollo" required />
      </div>

      <div>
        <label className="text-sm font-medium">Descripción</label>
        <Input
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Ej: Pollo fresco de granja"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Unidad</label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-lg bg-background text-foreground"
          >
            <option value="kg">Kilogramos (kg)</option>
            <option value="L">Litros (L)</option>
            <option value="piezas">Piezas</option>
            <option value="docenas">Docenas</option>
            <option value="gramos">Gramos (g)</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium">Cantidad Inicial</label>
          <Input
            type="number"
            step="0.01"
            name="current_quantity"
            value={formData.current_quantity}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Cantidad Mínima</label>
          <Input type="number" step="0.01" name="min_quantity" value={formData.min_quantity} onChange={handleChange} />
        </div>

        <div>
          <label className="text-sm font-medium">Costo por Unidad</label>
          <Input
            type="number"
            step="0.01"
            name="cost_per_unit"
            value={formData.cost_per_unit}
            onChange={handleChange}
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Agregar Ingrediente
      </Button>
    </form>
  )
}
