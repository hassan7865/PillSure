import React from "react";
import { Badge } from "@/components/ui/badge";
import { Video, Phone, User, Stethoscope } from "lucide-react";

/**
 * Get status badge component with appropriate styling
 */
export function getStatusBadge(status: string) {
  if (!status) return <Badge variant="outline">Unknown</Badge>;
  
  const statusLower = status.toLowerCase().trim();
  switch (statusLower) {
    case 'completed':
      return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Completed</Badge>;
    case 'pending':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Pending</Badge>;
    case 'confirmed':
      return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Confirmed</Badge>;
    case 'in_progress':
    case 'in-progress':
      return <Badge variant="default" className="bg-purple-600 hover:bg-purple-700">In Progress</Badge>;
    case 'cancelled':
    case 'canceled':
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge variant="outline">{status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</Badge>;
  }
}

/**
 * Get consultation mode icon
 */
export function getConsultationModeIcon(mode: string) {
  const modeLower = mode?.toLowerCase();
  switch (modeLower) {
    case 'online':
      return <Video className="h-4 w-4" />;
    case 'phone':
      return <Phone className="h-4 w-4" />;
    case 'inperson':
    case 'in-person':
      return <User className="h-4 w-4" />;
    default:
      return <Stethoscope className="h-4 w-4" />;
  }
}