import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  event: {
    title: string;
  };
  customer: {
    name: string;
    email: string;
    avatar: string;
  };
  amount: string;
  status: "completed" | "pending" | "failed";
  date: string;
}

interface TransactionsTableProps {
  transactions: Transaction[];
}

const TransactionsTable = ({ transactions }: TransactionsTableProps) => {
  const getStatusBadge = (status: Transaction["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
            Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Transaction ID
            </TableHead>
            <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Event
            </TableHead>
            <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Customer
            </TableHead>
            <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </TableHead>
            <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </TableHead>
            <TableHead className="py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="bg-white divide-y divide-gray-200">
          {transactions.map((transaction) => (
            <TableRow key={transaction.id} className="hover:bg-gray-50">
              <TableCell className="py-4 text-sm font-medium text-gray-900">
                {transaction.id}
              </TableCell>
              <TableCell className="py-4 text-sm text-gray-500">
                {transaction.event.title}
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={transaction.customer.avatar} alt={transaction.customer.name} />
                    <AvatarFallback>{transaction.customer.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {transaction.customer.name}
                    </div>
                    <div className="text-sm text-gray-500">{transaction.customer.email}</div>
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4 text-sm text-gray-500">
                {transaction.amount}
              </TableCell>
              <TableCell className="py-4">
                {getStatusBadge(transaction.status)}
              </TableCell>
              <TableCell className="py-4 text-sm text-gray-500">{transaction.date}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionsTable;
