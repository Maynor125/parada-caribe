"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import RecipesTable from "./recipes-table"
import AddRecipeForm from "./add-recipe-form"

export default function RecipesPage() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Gestión de Recetas</CardTitle>
              <CardDescription>Administra los platos y sus ingredientes</CardDescription>
            </div>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button className="flex gap-2">
                  <Plus size={20} />
                  Nueva Receta
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Crear Nueva Receta</DialogTitle>
                  <DialogDescription>Define un plato y sus ingredientes</DialogDescription>
                </DialogHeader>
                <AddRecipeForm onSuccess={() => setIsOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <RecipesTable />
        </CardContent>
      </Card>
    </div>
  )
}
