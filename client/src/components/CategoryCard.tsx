import { Link } from "wouter";
import { 
  Music, 
  Monitor, 
  Coffee, 
  Activity,
  Ticket,
  Camera,
  BookOpen,
  Users
} from "lucide-react";

interface CategoryCardProps {
  name: string;
  icon: string;
  eventCount: number;
}

const CategoryCard = ({ name, icon, eventCount }: CategoryCardProps) => {
  const getIcon = () => {
    switch (icon) {
      case 'music':
        return <Music className="text-xl" />;
      case 'laptop-code':
        return <Monitor className="text-xl" />;
      case 'utensils':
        return <Coffee className="text-xl" />;
      case 'running':
        return <Activity className="text-xl" />;
      case 'ticket':
        return <Ticket className="text-xl" />;
      case 'camera':
        return <Camera className="text-xl" />;
      case 'books':
        return <BookOpen className="text-xl" />;
      case 'users':
        return <Users className="text-xl" />;
      default:
        return <Ticket className="text-xl" />;
    }
  };
  
  const getBackgroundColor = () => {
    switch (icon) {
      case 'music':
        return 'bg-primary-100 text-primary-600';
      case 'laptop-code':
        return 'bg-blue-100 text-blue-600';
      case 'utensils':
        return 'bg-amber-100 text-amber-600';
      case 'running':
        return 'bg-green-100 text-green-600';
      case 'ticket':
        return 'bg-purple-100 text-purple-600';
      case 'camera':
        return 'bg-pink-100 text-pink-600';
      case 'books':
        return 'bg-indigo-100 text-indigo-600';
      case 'users':
        return 'bg-teal-100 text-teal-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <Link href={`/events?category=${encodeURIComponent(name)}`}>
      <a className="bg-white rounded-lg shadow-sm p-6 text-center transition duration-200 hover:shadow-md">
        <div className={`inline-flex items-center justify-center h-12 w-12 rounded-md ${getBackgroundColor()} mb-4`}>
          {getIcon()}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">{name}</h3>
        <p className="text-sm text-gray-500">{eventCount} events</p>
      </a>
    </Link>
  );
};

export default CategoryCard;
