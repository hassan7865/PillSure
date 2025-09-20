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
import { CategoryCardProps } from "@/lib/types";

const CategoryCard: React.FC<CategoryCardProps> = ({ title, imageSrc, subCategories }) => (
  <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl p-6 flex flex-col items-start text-left relative overflow-hidden group transition-all duration-300 border border-gray-200">
    {/* Decorative background */}
    <div
      className="absolute bottom-0 right-0 w-1/3 h-1/2 opacity-5 z-0"
      style={{
        backgroundImage: "radial-gradient(rgba(59,130,246,0.3) 1px, transparent 2px)",
        backgroundSize: "20px 20px",
      }}
    ></div>

    <h3 className="text-xl font-bold text-gray-900 mb-4 relative z-10 group-hover:text-blue-600 transition-colors duration-300">{title}</h3>

    {/* Image */}
    <div className="absolute right-0 top-1/2 transform -translate-y-1/2 pr-6">
      <Image
        src={imageSrc}
        alt={title}
        width={140}
        height={140}
        className="object-contain relative z-10 group-hover:scale-105 transition-transform duration-300"
      />
    </div>

    {/* Subcategories */}
    <ul className="text-gray-600 space-y-2 mb-6 relative z-10 ml-0">
      {subCategories.map((item, index) => (
        <li key={index} className="text-sm flex items-center font-medium">
          <div className="bg-gray-100 p-1 rounded-full mr-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-3 w-3 text-gray-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
          {item}
        </li>
      ))}
    </ul>

    {/* View all button */}
    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2 font-semibold transition-all duration-300 relative z-10 group/btn">
      View all
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-4 w-4 ml-2 group-hover/btn:translate-x-1 transition-transform duration-300"
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
    <section className="py-24 bg-gradient-to-br from-white to-slate-50">
      <div className="container mx-auto px-4">
        {/* Search Section */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search & Browse
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Find What You Need</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Search for medicines, find doctors, or browse our comprehensive healthcare categories
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-5xl mx-auto mb-16">
          <div className="flex flex-col md:flex-row gap-4 bg-white p-8 rounded-3xl shadow-2xl border-0 backdrop-blur-sm">
            {/* Use a 3-column layout on md+: input | select | button with equal widths */}
            <div className="md:w-1/3 w-full min-w-0">
              <Input
                type="text"
                placeholder="Search medicines, doctors, or symptoms..."
                className="w-full h-12 text-base rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300 px-4"
              />
            </div>

            <div className="md:w-1/3 w-full min-w-0">
              <Select>
                <SelectTrigger className="w-full h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="medicines">Medicines</SelectItem>
                  <SelectItem value="doctors">Doctors</SelectItem>
                  <SelectItem value="hospitals">Hospitals</SelectItem>
                  <SelectItem value="symptoms">Symptoms</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:w-1/3 w-full">
              <Button className="w-full h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-xl text-base font-semibold shadow-md hover:shadow-lg transition-all duration-300 px-4">
                Search
              </Button>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <CategoryCard
            title="Medicines"
            imageSrc="/Vit.png"
            subCategories={["Prescription Drugs", "Over-the-Counter", "Vitamins & Supplements", "Generic Medicines"]}
          />
          <CategoryCard
            title="Find Doctors"
            imageSrc="/Moc.png"
            subCategories={["General Practitioners", "Specialists", "Online Consultations", "Emergency Care"]}
          />
          <CategoryCard
            title="Hospitals"
            imageSrc="/aloe.png"
            subCategories={["Emergency Services", "Surgery Centers", "Diagnostic Centers", "Rehabilitation"]}
          />
        </div>
      </div>
    </section>
  );
};

export default ProductFilterAndCategories;
