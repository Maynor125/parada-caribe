"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { useState } from "react"

interface CashBoxHeaderProps {
  isOpen: boolean
  currentSession: any
  onOpenCash: (openingBalance: number) => void
  onCloseCash: (closingBalance: number) => void
}

export default function CashBoxHeader({ isOpen, currentSession, onOpenCash, onCloseCash }: CashBoxHeaderProps) {
  const [showOpenDialog, setShowOpenDialog] = useState(false)
  const [showCloseDialog, setShowCloseDialog] = useState(false)
  const [openingBalance, setOpeningBalance] = useState("0")
  const [closingBalance, setClosingBalance] = useState("0")

  const handleOpenCash = () => {
    onOpenCash(Number.parseFloat(openingBalance) || 0)
    setOpeningBalance("0")
    setShowOpenDialog(false)
  }

  const handleCloseCash = () => {
    onCloseCash(Number.parseFloat(closingBalance) || 0)
    setClosingBalance("0")
    setShowCloseDialog(false)
  }

  if (!isOpen) {
    return (
      <>
        <Card className="bg-red-50 border-2 border-red-500 mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-600 font-bold text-lg">Caja Cerrada</p>
                <p className="text-red-500 text-sm">Abre la caja para comenzar a registrar pedidos</p>
              </div>
              <Button
                onClick={() => setShowOpenDialog(true)}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-2 h-12 rounded-lg"
              >
                🔓 Abrir Caja
              </Button>
            </div>
          </CardContent>
        </Card>

        <AlertDialog open={showOpenDialog} onOpenChange={setShowOpenDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Abrir Caja</AlertDialogTitle>
              <AlertDialogDescription>Ingresa el monto inicial de la caja</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <label className="block text-sm font-bold mb-2">Monto Inicial ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                placeholder="0.00"
                className="border-2 border-primary"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleOpenCash} className="bg-green-600 hover:bg-green-700">
                Abrir
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>
      </>
    )
  }

  return (
    <>
      <Card className="bg-green-50 border-2 border-green-500 mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-green-600 font-bold text-lg">Caja Abierta</p>
              <p className="text-green-500 text-sm">
                Abierta: {currentSession?.opened_at ? new Date(currentSession.opened_at).toLocaleString("es-ES") : ""}
              </p>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Pedidos</p>
                  <p className="text-2xl font-bold text-foreground">{currentSession?.total_orders || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Ventas</p>
                  <p className="text-2xl font-bold text-green-600">${(currentSession?.total_sales || 0).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Saldo Inicial</p>
                  <p className="text-2xl font-bold text-foreground">
                    ${(currentSession?.opening_balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={() => setShowCloseDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-2 h-12 rounded-lg"
            >
              🔒 Cerrar Caja
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cerrar Caja</AlertDialogTitle>
            <AlertDialogDescription>Ingresa el monto final en la caja</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3">
            <div>
              <p className="text-sm font-bold text-muted-foreground">Total Registrado</p>
              <p className="text-2xl font-bold text-foreground">
                ${((currentSession?.opening_balance || 0) + (currentSession?.total_sales || 0)).toFixed(2)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-bold mb-2">Monto Final ($)</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={closingBalance}
                onChange={(e) => setClosingBalance(e.target.value)}
                placeholder="0.00"
                className="border-2 border-primary"
              />
            </div>
            <div>
              <p className="text-sm font-bold text-muted-foreground">Diferencia</p>
              <p
                className={`text-lg font-bold ${
                  Number.parseFloat(closingBalance) -
                    ((currentSession?.opening_balance || 0) + (currentSession?.total_sales || 0)) >=
                  0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                $
                {(
                  Number.parseFloat(closingBalance) -
                  ((currentSession?.opening_balance || 0) + (currentSession?.total_sales || 0))
                ).toFixed(2)}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCloseCash} className="bg-red-600 hover:bg-red-700">
              Cerrar Caja
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
