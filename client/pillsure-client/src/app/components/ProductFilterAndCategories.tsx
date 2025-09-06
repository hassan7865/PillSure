"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

interface CategoryCardProps {
  title: string;
  imageSrc: string;
  subCategories: string[];
}

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageSrc, subCategories }) => (
  <div className="bg-gray-100 rounded-lg shadow-md p-6 flex flex-col items-start text-left relative overflow-hidden group">
    {/* Decorative background */}
    <div
      className="absolute bottom-0 right-0 w-1/4 h-1/2 opacity-50 z-0"
      style={{
        backgroundImage: "radial-gradient(rgba(0,0,0,0.2) 1px, transparent 2px)",
        backgroundSize: "15px 15px",
      }}
    ></div>

    <h3 className="text-xl font-bold text-blue-900 mb-4 relative z-10">{title}</h3>

    {/* Image */}
    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-6">
      <Image
        src={imageSrc}
        alt={title}
        width={160}
        height={160}
        className="object-contain relative z-10"
      />
    </div>

    {/* Subcategories */}
    <ul className="text-gray-600 space-y-2 mb-6 relative z-10 ml-0">
      {subCategories.map((item, index) => (
        <li key={index} className="text-sm flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-3 w-3 mr-2 text-blue-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          {item}
        </li>
      ))}
    </ul>

    {/* View all button */}
    <Button className="bg-blue-900 text-white rounded-full hover:bg-blue-700 transition duration-300 relative z-10">
      View all
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 ml-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Button>
  </div>
);

const ProductFilterAndCategories: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        {/* Filter Section */}
        <div className="flex flex-wrap justify-center items-center gap-4 mb-12 bg-white p-6 rounded-lg shadow-sm">
          {/* Product Select */}
          <Select>
            <SelectTrigger className="w-[200px] rounded-full">
              <SelectValue placeholder="Select a product" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="vitamin">Vitamin</SelectItem>
              <SelectItem value="supplement">Supplement</SelectItem>
            </SelectContent>
          </Select>

          {/* Category Select */}
          <Select>
            <SelectTrigger className="w-[200px] rounded-full">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="health">Health</SelectItem>
              <SelectItem value="baby">Baby</SelectItem>
            </SelectContent>
          </Select>

          {/* Brand Select */}
          <Select>
            <SelectTrigger className="w-[200px] rounded-full">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brand-a">Brand A</SelectItem>
              <SelectItem value="brand-b">Brand B</SelectItem>
            </SelectContent>
          </Select>

          <span className="text-gray-500 font-semibold">OR</span>

          {/* SKU Input */}
          <Input
            type="text"
            placeholder="Enter SKU"
            className="rounded-full w-[200px]"
          />

          {/* Shop Now Button */}
          <Button className="bg-blue-900 text-white rounded-full hover:bg-blue-700 transition duration-300">
            Shop now
          </Button>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <CategoryCard
            title="Vitamins"
            imageSrc="/Vit.png"
            subCategories={["Analgesics", "Antimalarial Drugs", "Antipyretics", "Antibiotics"]}
          />
          <CategoryCard
            title="Baby Accessories"
            imageSrc="/Moc.png"
            subCategories={["Meal Replacements", "Protein powder", "Muscle building", "Low Calorie Snacks"]}
          />
          <CategoryCard
            title="Herbs"
            imageSrc="/aloe.png"
            subCategories={["Gluten Free", "Sun Care", "Sugar Free", "Super foods"]}
          />
        </div>
      </div>
    </section>
  );
};

export default ProductFilterAndCategories;
