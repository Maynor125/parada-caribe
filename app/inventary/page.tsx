import IngredientsPage from '@/components/inventary/ingredients-page'
import InventoryDashboard from '@/components/inventary/inventory-dashboard'
import OrderPreparationPage from '@/components/inventary/order-preparation-page'
import ProductsPage from '@/components/inventary/products-page'
import RecipesPage from '@/components/inventary/recipes-page'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'
import React from 'react'

const page = () => {
  return (
   <main className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between">
          <h1 className="text-4xl font-bold mb-8 text-foreground">Gestión de Restaurante</h1>
<div className="">
    <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 h-12 rounded-lg mr-3">
               Pedidos
            </Button>
          </Link>
          <Link href="/summary">
            <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 h-12 rounded-lg">
              📊 Resumen de Caja
            </Button>
          </Link>
</div>
        </div>
        
        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full grid-cols-7 mb-8">
           
            <TabsTrigger value="products">Productos</TabsTrigger>
          
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="ingredients">Ingredientes</TabsTrigger>
            <TabsTrigger value="recipes">Recetas</TabsTrigger>
            <TabsTrigger value="orders">Preparar</TabsTrigger>
          </TabsList>

       

          <TabsContent value="products">
            <ProductsPage />
          </TabsContent>

          <TabsContent value="dashboard">
            <InventoryDashboard />
          </TabsContent>

          <TabsContent value="ingredients">
            <IngredientsPage />
          </TabsContent>

          <TabsContent value="recipes">
            <RecipesPage />
          </TabsContent>

          <TabsContent value="orders">
            <OrderPreparationPage />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}

export default page