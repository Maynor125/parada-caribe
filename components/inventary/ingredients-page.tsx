"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import IngredientsTable from "./ingredients-table"
import AddIngredientForm from "./add-ingredient-form"

export default function IngredientsPage() {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Gestión de Ingredientes</CardTitle>
              <CardDescription>Administra los insumos del restaurante</CardDescription>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="flex gap-2">
                  <Plus size={20} />
                  Agregar Ingrediente
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Agregar Ingrediente</DialogTitle>
                  <DialogDescription>Crea un nuevo ingrediente para el inventario</DialogDescription>
                </DialogHeader>
                <AddIngredientForm onSuccess={() => setIsOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Buscar ingrediente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <IngredientsTable searchTerm={searchTerm} />
        </CardContent>
      </Card>
    </div>
  )
}
