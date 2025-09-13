"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import { Doctor } from "@/lib/types";


export default function DoctorCard({ doc }: { doc: Doctor }) {
  return (
    <Card className="shadow-sm rounded-2xl">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Doctor Info */}
          <div className="flex items-center gap-3">
            <img
              src={doc.image}
              alt={doc.name}
              className="w-14 h-14 rounded-full object-cover border"
            />
            <div>
              <h2 className="font-semibold">{doc.name}</h2>
              <p className="text-sm text-gray-600">
                {doc.specialization} (Exp: {doc.experience} yrs)
              </p>
            </div>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full text-sm">
            <Star className="w-4 h-4 fill-[#1a237e]" />
            {doc.rating}
          </div>
        </div>

        {/* Status + Fee */}
        <div className="bg-gray-100 rounded-lg p-4 mt-3 text-sm text-left">
            <div className="font-medium mr-1 pb-2">Fees</div>
          <p className="font-medium">PKR {doc.fee}/Checkup</p>
        </div>

        {/* Book Button */}
        <div className="flex justify-end mt-3">
          <Button className="rounded-full px-4 py-1 text-sm">
            Book
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
