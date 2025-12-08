"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Product } from "@/types"

interface ProductListProps {
  products: Product[]
  onAddProduct: (product: Product) => void
}

export default function ProductList({ products, onAddProduct }: ProductListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <Card
          key={product.id}
          className="hover:shadow-xl transition-all cursor-pointer hover:scale-105 border-2 border-primary border-opacity-20 bg-surface"
        >
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
                <p className="text-3xl font-bold text-primary mt-3">${Number(product.price).toFixed(2)}</p>
              </div>
              <Button
                onClick={() => onAddProduct(product)}
                className="w-full bg-primary hover:bg-primary-dark text-white h-14 text-lg font-bold rounded-lg"
              >
                + Agregar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
