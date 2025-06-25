import { ArrowUp, ArrowDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: number;
  unit?: string;
}

const StatsCard = ({ title, value, change, unit }: StatsCardProps) => {
  const isPositive = change ? change > 0 : undefined;

  return (
    <Card className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <CardContent className="p-0">
        <div className="flex justify-between items-center mb-1">
          <h4 className="text-sm font-medium text-gray-500">{title}</h4>
          {change !== undefined && (
            <span
              className={`text-xs font-medium flex items-center ${
                isPositive ? "text-green-500" : "text-red-500"
              }`}
            >
              {isPositive ? (
                <ArrowUp className="mr-1 h-3 w-3" />
              ) : (
                <ArrowDown className="mr-1 h-3 w-3" />
              )}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <div className="flex items-baseline">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {unit && <span className="ml-2 text-xs text-gray-500">{unit}</span>}
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;
