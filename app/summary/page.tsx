"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CashBoxHeader from "@/components/cash-box-header";
import Image from "next/image";
import logoParadaCaribe from "../../public/iso-paradacaribe.png";
import { FileText, Loader2, Printer } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function SummaryPage() {
  const [loading, setLoading] = useState(true);
  const [cashBoxOpen, setCashBoxOpen] = useState(false);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [supabaseClient, setSupabaseClient] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);

      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        throw new Error("Environment variables not set");
      }

      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      );
      setSupabaseClient(supabase);

      // Check for existing cash sessions
      try {
        const { data: sessions, error: sessionsError } = await supabase
          .from("cash_sessions")
          .select("*")
          .is("closed_at", null)
          .order("opened_at", { ascending: false })
          .limit(1);

        if (sessionsError && sessionsError.code !== "PGRST116")
          throw sessionsError;

        if (sessions && sessions.length > 0) {
          setCurrentSession(sessions[0]);
          setCashBoxOpen(true);

          // Fetch orders for this session
          const { data: ordersData, error: ordersError } = await supabase
            .from("orders")
            .select("*")
            .eq("cash_session_id", sessions[0].id)
            .order("created_at", { ascending: false });

          if (ordersError && ordersError.code !== "PGRST116") throw ordersError;

          setOrders(ordersData || []);
        }
      } catch (e: any) {
        if (e.code !== "PGRST116") {
          console.error("[v0] Error loading cash sessions:", e);
        }
      }
    } catch (err) {
      console.error("[v0] Error loading data:", err);
      setError(err instanceof Error ? err.message : "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenCash = async (openingBalance: number) => {
    if (!supabaseClient) return;

    try {
      const { data, error } = await supabaseClient
        .from("cash_sessions")
        .insert([
          {
            opening_balance: openingBalance,
            total_sales: 0,
            total_orders: 0,
          },
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setCurrentSession(data[0]);
        setCashBoxOpen(true);
        setOrders([]);
      }
    } catch (err) {
      console.error("[v0] Error opening cash:", err);
    }
  };

  const handleCloseCash = async (closingBalance: number) => {
    if (!supabaseClient || !currentSession) return;

    try {
      const { error } = await supabaseClient
        .from("cash_sessions")
        .update({
          closed_at: new Date(),
          closing_balance: closingBalance,
        })
        .eq("id", currentSession.id);

      if (error) throw error;

      setCashBoxOpen(false);
      setCurrentSession(null);
      setOrders([]);
      alert("Caja cerrada exitosamente");
    } catch (err) {
      console.error("[v0] Error closing cash:", err);
    }
  };

  // Función para imprimir (simplificada)
  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Resumen de Caja - Parada Caribe</title>
        <meta charset="utf-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 1.4;
            color: #000;
            padding: 20px;
            margin: 0;
          }
          @media print {
            @page {
              margin: 10mm;
            }
            .no-print {
              display: none !important;
            }
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .title {
            font-size: 22px;
            font-weight: bold;
            margin: 10px 0;
            color: #1a56db;
          }
          .subtitle {
            font-size: 14px;
            color: #666;
            margin-bottom: 15px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin: 20px 0;
          }
          .summary-item {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 10px;
            background: #f9f9f9;
          }
          .summary-label {
            font-size: 11px;
            color: #666;
            font-weight: bold;
            display: block;
            margin-bottom: 3px;
          }
          .summary-value {
            font-size: 16px;
            font-weight: bold;
            color: #000;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th {
            background: #333;
            color: white;
            font-weight: bold;
            padding: 8px;
            text-align: left;
            border: 1px solid #ddd;
          }
          .table td {
            padding: 8px;
            border: 1px solid #ddd;
          }
          .text-right {
            text-align: right;
          }
          .total-row {
            background: #eee;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 10px;
          }
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          }
        </script>
      </body>
      </html>
    `);

    printWindow.document.close();
  };

  // Función para generar contenido de impresión
  const generatePrintContent = () => {
    const totals = calculateTotals();

    return `
      <div class="header">
        <h1 class="title">PARADA CARIBE</h1>
        <p class="subtitle">RESUMEN DE CAJA</p>
        ${
          currentSession
            ? `
          <div style="font-size: 11px; margin: 10px 0; padding: 10px; background: #f0f0f0; border-radius: 4px;">
            <div><strong>Fecha de apertura:</strong> ${new Date(
              currentSession.opened_at
            ).toLocaleString()}</div>
            <div><strong>Sesión ID:</strong> ${currentSession.id.substring(
              0,
              12
            )}...</div>
          </div>
        `
            : ""
        }
      </div>

      <div class="summary-grid">
        <div class="summary-item">
          <span class="summary-label">SALDO INICIAL</span>
          <span class="summary-value">$${totals.openingBalance.toFixed(
            2
          )}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">VENTAS TOTALES</span>
          <span class="summary-value">$${totals.totalSales.toFixed(2)}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">TOTAL ÓRDENES</span>
          <span class="summary-value">${totals.totalOrders}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">PROMEDIO/ORDEN</span>
          <span class="summary-value">$${totals.averageOrder.toFixed(2)}</span>
        </div>
        <div class="summary-item" style="grid-column: span 2; background: #e3f2fd;">
          <span class="summary-label">SALDO ESTIMADO</span>
          <span class="summary-value" style="color: #1565c0; font-size: 18px;">
            $${totals.estimatedBalance.toFixed(2)}
          </span>
        </div>
      </div>

      ${
        orders.length > 0
          ? `
        <h3 style="margin: 20px 0 10px 0; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">
          DETALLE DE ÓRDENES (${orders.length})
        </h3>
        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>HORA</th>
              <th>PRODUCTOS</th>
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${orders
              .map(
                (order, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${new Date(order.created_at).toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}</td>
                <td>
                  ${
                    order.items &&
                    order.items
                      .map(
                        (item: any) =>
                          `<div style="margin: 1px 0;">• ${item.product_name} x${item.quantity}</div>`
                      )
                      .join("")
                  }
                </td>
                <td class="text-right">$${Number(order.total).toFixed(2)}</td>
              </tr>
            `
              )
              .join("")}
            <tr class="total-row">
              <td colspan="3" class="text-right"><strong>TOTAL GENERAL:</strong></td>
              <td class="text-right"><strong style="color: #d32f2f;">$${totals.totalSales.toFixed(
                2
              )}</strong></td>
            </tr>
          </tbody>
        </table>
      `
          : '<p style="text-align: center; margin: 20px; color: #666;">No hay órdenes registradas</p>'
      }

      <div class="footer">
        <div>Generado el ${new Date().toLocaleString()}</div>
        <div style="font-style: italic; margin-top: 5px;">Sistema de Gestión - Parada Caribe</div>
      </div>
    `;
  };

  // Función para exportar a PDF (versión simplificada)
  const handleExportPDF = async () => {
    try {
      setIsGeneratingPDF(true);

      // Intentamos cargar jsPDF dinámicamente
      const { default: jsPDF } = await import("jspdf");

      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      // Cabecera
      doc.setFontSize(20);
      doc.setTextColor(26, 86, 219); // Azul
      doc.text("PARADA CARIBE", pageWidth / 2, 20, { align: "center" });

      doc.setFontSize(14);
      doc.setTextColor(102, 102, 102); // Gris
      doc.text("RESUMEN DE CAJA", pageWidth / 2, 28, { align: "center" });

      // Línea separadora
      doc.setDrawColor(51, 51, 51);
      doc.setLineWidth(0.5);
      doc.line(20, 32, pageWidth - 20, 32);

      // Información de la sesión
      if (currentSession) {
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);

        const sessionInfoY = 40;
        doc.text(
          `Sesión ID: ${currentSession.id.substring(0, 12)}...`,
          20,
          sessionInfoY
        );
        doc.text(
          `Apertura: ${new Date(currentSession.opened_at).toLocaleString()}`,
          20,
          sessionInfoY + 5
        );

        // Cuadro de información
        doc.setDrawColor(221, 221, 221);
        doc.setFillColor(240, 240, 240);
        doc.roundedRect(20, sessionInfoY - 5, pageWidth - 40, 15, 2, 2, "F");
        doc.roundedRect(20, sessionInfoY - 5, pageWidth - 40, 15, 2, 2, "S");
      }

      // Resumen financiero
      const totals = calculateTotals();
      const summaryY = currentSession ? 65 : 45;

      // Crear cuadrícula de resumen
      const cellWidth = (pageWidth - 40) / 2;
      const cellHeight = 20;

      // Fila 1
      drawSummaryCell(
        doc,
        20,
        summaryY,
        cellWidth,
        cellHeight,
        "SALDO INICIAL",
        `$${totals.openingBalance.toFixed(2)}`,
        "#f8f9fa"
      );
      drawSummaryCell(
        doc,
        20 + cellWidth,
        summaryY,
        cellWidth,
        cellHeight,
        "VENTAS TOTALES",
        `$${totals.totalSales.toFixed(2)}`,
        "#f8f9fa"
      );

      // Fila 2
      drawSummaryCell(
        doc,
        20,
        summaryY + cellHeight,
        cellWidth,
        cellHeight,
        "TOTAL ÓRDENES",
        totals.totalOrders.toString(),
        "#f8f9fa"
      );
      drawSummaryCell(
        doc,
        20 + cellWidth,
        summaryY + cellHeight,
        cellWidth,
        cellHeight,
        "PROMEDIO/ORDEN",
        `$${totals.averageOrder.toFixed(2)}`,
        "#f8f9fa"
      );

      // Fila 3 - Saldo estimado (ocupando 2 columnas)
      doc.setFillColor(227, 242, 253); // Azul claro
      doc.roundedRect(
        20,
        summaryY + cellHeight * 2,
        pageWidth - 40,
        cellHeight,
        2,
        2,
        "F"
      );
      doc.setDrawColor(33, 150, 243); // Azul
      doc.roundedRect(
        20,
        summaryY + cellHeight * 2,
        pageWidth - 40,
        cellHeight,
        2,
        2,
        "S"
      );

      doc.setFontSize(11);
      doc.setTextColor(102, 102, 102);
      doc.text("SALDO ESTIMADO", pageWidth / 2, summaryY + cellHeight * 2 + 7, {
        align: "center",
      });

      doc.setFontSize(16);
      doc.setTextColor(21, 101, 192); // Azul oscuro
      doc.text(
        `$${totals.estimatedBalance.toFixed(2)}`,
        pageWidth / 2,
        summaryY + cellHeight * 2 + 15,
        { align: "center" }
      );

      // Detalle de órdenes
      const ordersStartY = summaryY + cellHeight * 3 + 20;

      if (orders.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text(`DETALLE DE ÓRDENES (${orders.length})`, 20, ordersStartY);

        // Encabezado de la tabla
        const tableY = ordersStartY + 10;
        doc.setFillColor(51, 51, 51);
        doc.rect(20, tableY, pageWidth - 40, 8, "F");

        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text("#", 25, tableY + 5.5);
        doc.text("HORA", 35, tableY + 5.5);
        doc.text("PRODUCTOS", 60, tableY + 5.5);
        doc.text("TOTAL", pageWidth - 25, tableY + 5.5, { align: "right" });

        // Filas de órdenes
        let currentY = tableY + 8;
        doc.setFontSize(9);
        doc.setTextColor(0, 0, 0);

        for (let i = 0; i < orders.length && i < 15; i++) {
          const order = orders[i];

          // Alternar color de fondo
          if (i % 2 === 0) {
            doc.setFillColor(250, 250, 250);
          } else {
            doc.setFillColor(255, 255, 255);
          }

          const rowHeight = Math.max(15, (order.items?.length || 1) * 4.5);
          doc.rect(20, currentY, pageWidth - 40, rowHeight, "F");

          // Bordes
          doc.setDrawColor(221, 221, 221);
          doc.rect(20, currentY, pageWidth - 40, rowHeight, "S");

          // Contenido
          doc.text((i + 1).toString(), 25, currentY + 5);
          doc.text(
            new Date(order.created_at).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            }),
            35,
            currentY + 5
          );

          // Productos
          if (order.items) {
            let itemY = currentY + 4;
            order.items.forEach((item: any, idx: number) => {
              const text = `• ${item.product_name} x${item.quantity}`;
              doc.text(text, 60, itemY + idx * 4);
            });
          }

          doc.text(
            `$${Number(order.total).toFixed(2)}`,
            pageWidth - 25,
            currentY + 5,
            { align: "right" }
          );

          currentY += rowHeight;

          // Salto de página si es necesario
          if (currentY > 250 && i < orders.length - 1) {
            doc.addPage();
            currentY = 20;
          }
        }

        // Total general
        const totalY = currentY + 5;
        doc.setFillColor(233, 236, 239);
        doc.rect(20, totalY, pageWidth - 40, 10, "F");
        doc.setDrawColor(222, 226, 230);
        doc.rect(20, totalY, pageWidth - 40, 10, "S");

        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.setFont("", "bold");
        doc.text("TOTAL GENERAL:", pageWidth - 85, totalY + 6.5, {
          align: "right",
        });
        doc.text(
          `$${totals.totalSales.toFixed(2)}`,
          pageWidth - 25,
          totalY + 6.5,
          { align: "right" }
        );
        doc.setFont("", "normal");
      } else {
        doc.setFontSize(11);
        doc.setTextColor(102, 102, 102);
        doc.text("No hay órdenes registradas", pageWidth / 2, ordersStartY, {
          align: "center",
        });
      }

      // Pie de página
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setTextColor(102, 102, 102);
      doc.text(
        `Generado el ${new Date().toLocaleString()}`,
        pageWidth / 2,
        footerY,
        { align: "center" }
      );
      doc.text(
        "Sistema de Gestión - Parada Caribe",
        pageWidth / 2,
        footerY + 4,
        { align: "center" }
      );

      // Guardar PDF
      const dateStr = new Date().toISOString().split("T")[0];
      doc.save(`resumen_caja_${dateStr}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
      // Si falla jsPDF, intentamos con la impresión simple
      alert("Error al generar el PDF. Usando impresión simple...");
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Función auxiliar para dibujar celdas de resumen
  const drawSummaryCell = (
    doc: any,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    value: string,
    fillColor: string
  ) => {
    // Fondo
    doc.setFillColor(fillColor);
    doc.roundedRect(x, y, width, height, 2, 2, "F");

    // Borde
    doc.setDrawColor(222, 226, 230);
    doc.roundedRect(x, y, width, height, 2, 2, "S");

    // Texto
    doc.setFontSize(9);
    doc.setTextColor(108, 117, 125);
    doc.text(label, x + width / 2, y + 6, { align: "center" });

    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(value, x + width / 2, y + 14, { align: "center" });
  };

  // Calcular totales
  const calculateTotals = () => {
    const totalSales = orders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    );
    const totalOrders = orders.length;
    const averageOrder = totalOrders > 0 ? totalSales / totalOrders : 0;
    const openingBalance = Number(currentSession?.opening_balance || 0);
    const estimatedBalance = openingBalance + totalSales;

    return {
      totalSales,
      totalOrders,
      averageOrder,
      openingBalance,
      estimatedBalance,
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="mb-4 text-4xl">🏝️</div>
          <p className="text-xl font-bold text-foreground">
            Cargando resumen...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-xl font-bold text-red-600">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header with navigation */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image
              src={logoParadaCaribe}
              alt="Logo Parada Caribe"
              width={65}
              height={65}
              className="w-16 h-16 md:w-20 md:h-20"
            />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                PARADA CARIBE
              </h1>
              <p className="text-lg text-muted-foreground">Resumen de Caja</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex gap-3">
              {cashBoxOpen && (
                <>
                  <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="gap-3 px-6 py-2 h-12 rounded-lg"
                    disabled={isGeneratingPDF}
                  >
                    <Printer className="h-4 w-4" />
                    Imprimir
                  </Button>
                  <Button
                    onClick={handleExportPDF}
                    variant="outline"
                    className="gap-2 px-6 py-2 h-12 rounded-lg"
                    disabled={isGeneratingPDF}
                  >
                    {isGeneratingPDF ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileText className="h-4 w-4" />
                    )}
                    {isGeneratingPDF ? "Generando..." : "Exportar PDF"}
                  </Button>
                </>
              )}
            </div>
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-white font-bold px-6 py-2 h-12 rounded-lg w-full sm:w-auto">
                📝 Crear Pedidos
              </Button>
            </Link>
          </div>
        </div>

        {/* Cash Box Management */}
        <CashBoxHeader
          isOpen={cashBoxOpen}
          currentSession={currentSession}
          onOpenCash={handleOpenCash}
          onCloseCash={handleCloseCash}
        />

        {/* Resumen financiero visible en pantalla */}
        {cashBoxOpen && currentSession && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Inicial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totals.openingBalance.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Ventas Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${totals.totalSales.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {totals.totalOrders} órdenes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Promedio por Orden
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${totals.averageOrder.toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Saldo Estimado
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  ${totals.estimatedBalance.toFixed(2)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders List */}
        {cashBoxOpen && orders.length > 0 && (
          <Card className="mt-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detalle de Órdenes</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Total: {orders.length} órdenes • $
                  {totals.totalSales.toFixed(2)}
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-bold">#</th>
                      <th className="text-left py-3 px-4 font-bold">Hora</th>
                      <th className="text-left py-3 px-4 font-bold">
                        Productos
                      </th>
                      <th className="text-right py-3 px-4 font-bold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order, index) => (
                      <tr
                        key={index}
                        className="border-b border-border hover:bg-muted/50"
                      >
                        <td className="py-3 px-4">{index + 1}</td>
                        <td className="py-3 px-4">
                          {new Date(order.created_at).toLocaleTimeString(
                            "es-ES"
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            {order.items &&
                              order.items.map((item: any, idx: number) => (
                                <div key={idx} className="text-sm">
                                  {item.product_name} x{item.quantity}
                                </div>
                              ))}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-primary">
                          ${Number(order.total).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {cashBoxOpen && orders.length === 0 && (
          <Card className="mt-8">
            <CardContent className="pt-6 text-center text-muted-foreground">
              <p>No hay órdenes registradas aún en esta sesión de caja</p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
