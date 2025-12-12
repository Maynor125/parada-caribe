"use client"

import { AlertTriangle, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { Product } from "@/types"

interface ProductListProps {
  products: Product[]
  onAddProduct: (product: Product) => void
}

export default function ProductList({ products, onAddProduct }: ProductListProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
      {products.map((product) => {
        const isLowStock = product.current_stock <= product.min_stock
        const isOutOfStock = !product.recipe_id && product.current_stock <= 0

        return (
          <Card
            key={product.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              isOutOfStock ? "opacity-50 border-red-300" : ""
            }`}
            onClick={() => !isOutOfStock && onAddProduct(product)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col gap-2">
                {/* Nombre del producto */}
                <h3 className="font-bold text-lg text-foreground line-clamp-2">{product.name}</h3>

                {/* Precio */}
                <p className="text-2xl font-bold text-primary">${product.price.toFixed(2)}</p>

                {/* Stock info */}
                <div className="flex items-center gap-2 mt-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Stock: {product.current_stock}</span>

                  {/* Alerta de stock bajo */}
                  {isLowStock && !isOutOfStock && <AlertTriangle className="h-4 w-4 text-orange-500" />}
                </div>

                {/* Badge de estado */}
                {isOutOfStock && (
                  <Badge variant="destructive" className="w-fit">
                    Sin stock
                  </Badge>
                )}

                {isLowStock && !isOutOfStock && (
                  <Badge variant="secondary" className="w-fit bg-orange-100 text-orange-700">
                    Stock bajo
                  </Badge>
                )}

                {/* Botón de agregar */}
                <Button
                  className="w-full mt-2"
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation()
                    onAddProduct(product)
                  }}
                >
                  {isOutOfStock ? "Sin stock" : "Agregar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
