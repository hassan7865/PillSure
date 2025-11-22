import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconTrendingUp } from "@tabler/icons-react";
import { AdminStats } from "../admin/_components/_types";
import Loader from "@/components/ui/loader";

interface AdminStatsCardProps {
  stats: AdminStats | null;
  isLoading: boolean;
}

export default function AdminStatsCard({ stats, isLoading }: AdminStatsCardProps) {
  if (isLoading) {
    return (
      <Card className="@container/card">
        <CardContent className="p-6">
          <Loader
            title="Loading Statistics"
            description="Fetching admin statistics..."
          />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const totalMedicines = stats.medicines.total;
  const inStockMedicines = stats.medicines.inStock;

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>Total Medicines</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {totalMedicines.toLocaleString()}
        </CardTitle>
        <CardAction>
          <Badge variant="outline">
            <IconTrendingUp />
            {inStockMedicines} in stock
          </Badge>
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {inStockMedicines} medicines available <IconTrendingUp className="size-4" />
        </div>
        <div className="text-muted-foreground">
          {totalMedicines - inStockMedicines} out of stock
        </div>
      </CardFooter>
    </Card>
  );
}

