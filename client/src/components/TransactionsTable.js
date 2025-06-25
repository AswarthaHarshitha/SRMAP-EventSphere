
const TransactionsTable = ({ transactions }) => {
  const getStatusBadge = (status) => {
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
    <div>
      {/* Add your table implementation here */}
    </div>
  );
};

export default TransactionsTable;
