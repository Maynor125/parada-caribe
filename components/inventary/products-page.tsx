"use client"

import { useState, useEffect } from "react"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, Trash2, Edit2 } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface Category {
  id: string
  name: string
}

interface Recipe {
  id: string
  name: string
}

interface Product {
  id: string
  name: string
  description: string | null
  price: number
  category_id: string
  recipe_id: string | null
  is_active: boolean
  current_stock: number
  min_stock: number
  created_at: string
  updated_at: string
  categories: Category
  recipes: Recipe | null
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    category_id: "",
    recipe_id: "",
    current_stock: "",
    min_stock: "",
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [productsRes, categoriesRes, recipesRes] = await Promise.all([
        supabase.from("products").select("*, categories(id, name), recipes(id, name)").order("name"),
        supabase.from("categories").select("id, name").order("name"),
        supabase.from("recipes").select("id, name").eq("is_active", true).order("name"),
      ])

      if (productsRes.error) throw productsRes.error
      if (categoriesRes.error) throw categoriesRes.error
      if (recipesRes.error) throw recipesRes.error

      setProducts(productsRes.data || [])
      setCategories(categoriesRes.data || [])
      setRecipes(recipesRes.data || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar datos")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProduct = async () => {
    if (!formData.name.trim() || !formData.category_id || !formData.price) {
      setError("Nombre, categoría y precio son requeridos")
      return
    }

    try {
      const updateData = {
        name: formData.name,
        description: formData.description || null,
        price: Number.parseFloat(formData.price),
        category_id: formData.category_id,
        recipe_id: formData.recipe_id === "none" ? null : formData.recipe_id || null,
        current_stock: Number.parseInt(formData.current_stock) || 0,
        min_stock: Number.parseInt(formData.min_stock) || 10,
      }

      if (editingId) {
        const { error } = await supabase.from("products").update(updateData).eq("id", editingId)
        if (error) throw error
      } else {
        const { error } = await supabase.from("products").insert([{ ...updateData, is_active: true }])
        if (error) throw error
      }

      setFormData({
        name: "",
        description: "",
        price: "",
        category_id: "",
        recipe_id: "",
        current_stock: "",
        min_stock: "",
      })
      setEditingId(null)
      setIsOpen(false)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar producto")
      console.error(err)
    }
  }

  const handleEditProduct = (product: Product) => {
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      category_id: product.category_id,
      recipe_id: product.recipe_id || "",
      current_stock: (product.current_stock ?? 0).toString(),
      min_stock: (product.min_stock ?? 10).toString(),
    })
    setEditingId(product.id)
    setIsOpen(true)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("¿Está seguro que desea eliminar este producto?")) return

    try {
      const { error } = await supabase.from("products").delete().eq("id", id)
      if (error) throw error
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar producto")
    }
  }

  if (loading) return <div className="text-center py-8">Cargando productos...</div>

  const filteredProducts = products.filter((product) => product.name.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestión de Productos</h2>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null)
                setFormData({
                  name: "",
                  description: "",
                  price: "",
                  category_id: "",
                  recipe_id: "",
                  current_stock: "",
                  min_stock: "",
                })
              }}
            >
              + Nuevo Producto
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Producto" : "Crear Nuevo Producto"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Actualice los detalles del producto" : "Agregue un nuevo producto"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Nombre</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nombre del producto"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Precio</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Stock Actual</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.current_stock}
                  onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Stock Mínimo (Alerta)</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.min_stock}
                  onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                  placeholder="10"
                />
              </div>

              <div>
                <label className="text-sm font-medium">Receta (si es comida)</label>
                <Select
                  value={formData.recipe_id}
                  onValueChange={(value) => setFormData({ ...formData, recipe_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione receta (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin receta</SelectItem>
                    {recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional"
                />
              </div>

              <Button onClick={handleSaveProduct} className="w-full">
                {editingId ? "Actualizar Producto" : "Crear Producto"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div>
        <Input
          placeholder="Buscar producto por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        <p className="text-sm text-gray-600 mt-1">
          {filteredProducts.length} de {products.length} productos
        </p>
      </div>

      <div className="space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-gray-600">
            {searchTerm ? "No se encontraron productos con ese nombre" : "No hay productos disponibles"}
          </div>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{product.name}</h3>
                  <p className="text-sm text-gray-600 mb-2">{product.description}</p>
                  <div className="flex gap-4 text-sm flex-wrap">
                    <span className="font-medium">Precio: ${product.price.toFixed(2)}</span>
                    <span className="text-gray-600">{product.categories.name}</span>
                    <span
                      className={
                        product.current_stock <= product.min_stock ? "text-red-600 font-semibold" : "text-gray-600"
                      }
                    >
                      Stock: {product.current_stock} {product.current_stock <= product.min_stock && "(⚠️ Bajo)"}
                    </span>
                    {product.recipes && (
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                        Receta: {product.recipes.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => handleEditProduct(product)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
