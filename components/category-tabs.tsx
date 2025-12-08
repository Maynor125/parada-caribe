"use client"

interface CategoryTabsProps {
  categories: string[]
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export default function CategoryTabs({ categories, activeCategory, onCategoryChange }: CategoryTabsProps) {
  return (
    <div className="flex gap-3 mb-8 flex-wrap">
      {categories.map((category) => (
        <button
          key={category}
          onClick={() => onCategoryChange(category)}
          className={`px-6 py-3 rounded-lg font-semibold text-base transition-all ${
            activeCategory === category
              ? "bg-primary text-white shadow-lg scale-105"
              : "bg-surface text-foreground hover:bg-opacity-80 border-2 border-primary border-opacity-30"
          }`}
        >
          {category}
        </button>
      ))}
    </div>
  )
}
