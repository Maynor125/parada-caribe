"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"
import type { OrderItem } from "@/types"

interface OrderSummaryProps {
  items: OrderItem[]
  onUpdateQuantity: (itemId: string, quantity: number) => void
  onRemoveItem: (itemId: string) => void
  onClearOrder: () => void
  onPrint: () => void
}

export default function OrderSummary({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onPrint,
}: OrderSummaryProps) {
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <Card className="sticky top-6 bg-surface border-4 border-primary shadow-xl">
      <CardHeader className="bg-primary text-white rounded-t-lg">
        <CardTitle className="text-2xl font-bold">Resumen del Pedido</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 h-full">
          {/* Items List */}
          <div className="flex-1 overflow-y-auto max-h-80 space-y-2 border-2 border-primary border-opacity-20 rounded-lg p-3 bg-background">
            {items.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 font-semibold">No hay items en el pedido</p>
            ) : (
              items.map((item) => (
                <div key={item.id} className="bg-surface p-3 rounded-lg border-2 border-primary border-opacity-10">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className="font-bold text-foreground text-sm">{item.product_name}</span>
                    <button
                      onClick={() => onRemoveItem(item.id)}
                      className="text-red-600 hover:text-red-700 p-1 font-bold"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                      className="px-3 py-1 bg-primary text-white hover:bg-primary-dark rounded font-bold"
                    >
                      −
                    </button>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateQuantity(item.id, Number.parseInt(e.target.value) || 1)}
                      className="w-14 text-center h-10 font-bold border-2 border-primary border-opacity-20"
                    />
                    <button
                      onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                      className="px-3 py-1 bg-primary text-white hover:bg-primary-dark rounded font-bold"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right text-foreground text-sm font-bold">
                    ${(item.price * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="border-t-2 border-primary border-opacity-20 pt-4">
            <div className="flex justify-between items-center mb-6 bg-primary bg-opacity-10 p-4 rounded-lg">
              <span className="text-lg font-bold text-foreground">Total:</span>
              <span className="text-4xl font-bold text-white ">C${total.toFixed(2)}</span>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button
                onClick={onPrint}
                disabled={items.length === 0}
                className="w-full bg-primary hover:bg-primary-dark text-white h-14 font-bold text-base rounded-lg"
              >
                🖨️ Imprimir (2 Copias)
              </Button>
              <Button
                onClick={onClearOrder}
                disabled={items.length === 0}
                variant="outline"
                className="w-full h-12 font-bold bg-transparent border-2 border-primary text-foreground hover:bg-primary hover:bg-opacity-10 rounded-lg"
              >
                Limpiar Pedido
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
