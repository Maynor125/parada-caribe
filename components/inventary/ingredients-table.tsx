"use client"

import { useEffect, useState } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { useToast } from "@/hooks/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Trash2, AlertTriangle, Edit2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface Ingredient {
  id: string
  name: string
  description: string
  unit: string
  current_quantity: number
  min_quantity: number
  cost_per_unit: number
}

export default function IngredientsTable({ searchTerm }: { searchTerm: string }) {
  const { toast } = useToast()
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({
    current_quantity: 0,
    min_quantity: 0,
  })

  useEffect(() => {
    fetchIngredients()
  }, [])

  const fetchIngredients = async () => {
    try {
      const { data, error } = await supabase.from("ingredients").select("*").order("name")

      if (error) throw error
      setIngredients(data || [])
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

  const openEditModal = (ingredient: Ingredient) => {
    setEditingId(ingredient.id)
    setEditForm({
      current_quantity: ingredient.current_quantity,
      min_quantity: ingredient.min_quantity,
    })
  }

  const handleSaveEdit = async () => {
    try {
      const { error } = await supabase
        .from("ingredients")
        .update({
          current_quantity: Number.parseFloat(editForm.current_quantity.toString()),
          min_quantity: Number.parseFloat(editForm.min_quantity.toString()),
        })
        .eq("id", editingId)

      if (error) throw error

      setIngredients(
        ingredients.map((ing) =>
          ing.id === editingId
            ? {
                ...ing,
                current_quantity: editForm.current_quantity,
                min_quantity: editForm.min_quantity,
              }
            : ing,
        ),
      )

      toast({
        title: "Éxito",
        description: "Ingrediente actualizado",
      })
      setEditingId(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este ingrediente?")) {
    return
    }
    try {
      const { error } = await supabase.from("ingredients").delete().eq("id", id)

      if (error) throw error

      setIngredients(ingredients.filter((i) => i.id !== id))
      toast({
        title: "Éxito",
        description: "Ingrediente eliminado",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  const filteredIngredients = ingredients.filter((ing) => ing.name.toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading) return <div>Cargando...</div>

  return (
    <>
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Unidad</TableHead>
              <TableHead>Stock Actual</TableHead>
              <TableHead>Stock Mínimo</TableHead>
              <TableHead>Costo/Unidad</TableHead>
              <TableHead>Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredIngredients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
                  No hay ingredientes registrados
                </TableCell>
              </TableRow>
            ) : (
              filteredIngredients.map((ing) => (
                <TableRow key={ing.id}>
                  <TableCell className="font-medium">{ing.name}</TableCell>
                  <TableCell>{ing.unit}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {ing.current_quantity}
                      {ing.current_quantity <= ing.min_quantity && (
                        <AlertTriangle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{ing.min_quantity}</TableCell>
                  <TableCell>${ing.cost_per_unit.toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditModal(ing)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(ing.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!editingId} onOpenChange={(open) => !open && setEditingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Ingrediente</DialogTitle>
            <DialogDescription>Actualiza el stock y cantidad mínima</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="current">Stock Actual</Label>
              <Input
                id="current"
                type="number"
                value={editForm.current_quantity}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    current_quantity: Number.parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="min">Stock Mínimo</Label>
              <Input
                id="min"
                type="number"
                value={editForm.min_quantity}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    min_quantity: Number.parseFloat(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditingId(null)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit}>Guardar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
