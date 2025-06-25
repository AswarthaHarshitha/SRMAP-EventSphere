import React from "react";
import { Link } from "wouter";
import { Category } from "@shared/schema";
import { Laptop, Music, Heart, Award, Zap, Users, BookOpen, Dumbbell } from "lucide-react";

interface CategoryCardProps {
  category: Category;
}

const CategoryCard: React.FC<CategoryCardProps> = ({ category }) => {
  // Get appropriate icon based on category name
  const getIcon = (categoryName: string, iconName: string) => {
    const lowerName = categoryName.toLowerCase();
    
    if (lowerName.includes("tech") || lowerName.includes("workshop") || iconName === "fa-laptop-code") {
      return <Laptop className="h-6 w-6" />;
    }
    if (lowerName.includes("cultural") || lowerName.includes("music") || lowerName.includes("arts") || iconName === "fa-music") {
      return <Music className="h-6 w-6" />;
    }
    if (lowerName.includes("social") || lowerName.includes("volunteer") || lowerName.includes("service")) {
      return <Heart className="h-6 w-6" />;
    }
    if (lowerName.includes("academic") || lowerName.includes("contest") || lowerName.includes("competition")) {
      return <Award className="h-6 w-6" />;
    }
    if (lowerName.includes("seminar") || lowerName.includes("talk") || lowerName.includes("lecture")) {
      return <BookOpen className="h-6 w-6" />;
    }
    if (lowerName.includes("club") || lowerName.includes("society") || lowerName.includes("group")) {
      return <Users className="h-6 w-6" />;
    }
    if (lowerName.includes("sports") || lowerName.includes("athlet") || iconName === "fa-running") {
      return <Dumbbell className="h-6 w-6" />;
    }
    
    // Default icon
    return <Zap className="h-6 w-6" />;
  };
  
  // Map category name to color scheme
  const getColorScheme = (categoryName: string, iconName: string) => {
    const lowerName = categoryName.toLowerCase();
    
    if (lowerName.includes("tech") || lowerName.includes("workshop") || iconName === "fa-laptop-code") {
      return {
        icon: "bg-blue-100 text-blue-600",
        border: "border-blue-200",
        hover: "hover:bg-blue-50"
      };
    }
    if (lowerName.includes("cultural") || lowerName.includes("music") || lowerName.includes("arts") || iconName === "fa-music") {
      return {
        icon: "bg-purple-100 text-purple-600",
        border: "border-purple-200",
        hover: "hover:bg-purple-50"
      };
    }
    if (lowerName.includes("social") || lowerName.includes("volunteer") || lowerName.includes("service")) {
      return {
        icon: "bg-pink-100 text-pink-600",
        border: "border-pink-200",
        hover: "hover:bg-pink-50"
      };
    }
    if (lowerName.includes("academic") || lowerName.includes("contest") || lowerName.includes("competition")) {
      return {
        icon: "bg-amber-100 text-amber-600",
        border: "border-amber-200",
        hover: "hover:bg-amber-50"
      };
    }
    if (lowerName.includes("sports") || lowerName.includes("athlet") || iconName === "fa-running") {
      return {
        icon: "bg-green-100 text-green-600",
        border: "border-green-200",
        hover: "hover:bg-green-50"
      };
    }
    
    // Default color scheme
    return {
      icon: "bg-primary-100 text-primary-600",
      border: "border-primary-200", 
      hover: "hover:bg-primary-50"
    };
  };

  const colors = getColorScheme(category.name, category.icon);
  const icon = getIcon(category.name, category.icon);
  
  // Generate meaningful description based on category name
  const getCategoryDescription = (categoryName: string) => {
    const lowerName = categoryName.toLowerCase();
    
    if (lowerName.includes("workshop")) {
      return "Hands-on learning sessions";
    }
    if (lowerName.includes("tech")) {
      return "Technical skill building";
    }
    if (lowerName.includes("cultural")) {
      return "Arts & cultural celebration";
    }
    if (lowerName.includes("academic")) {
      return "Curriculum enhancement";
    }
    if (lowerName.includes("seminar")) {
      return "Expert knowledge sharing";
    }
    if (lowerName.includes("club")) {
      return "Student-led initiatives";
    }
    if (lowerName.includes("sports")) {
      return "Athletics & competitions";
    }
    
    return `${category.eventCount} campus events`;
  };

  return (
    <Link href={`/events?category=${encodeURIComponent(category.name)}`}>
      <div className={`bg-white rounded-lg border ${colors.border} p-6 text-center transition duration-200 ${colors.hover} hover:shadow-md cursor-pointer flex flex-col items-center`}>
        <div className={`inline-flex items-center justify-center h-14 w-14 rounded-full ${colors.icon} mb-3`}>
          {icon}
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">{category.name}</h3>
        <p className="text-sm text-gray-500">{getCategoryDescription(category.name)}</p>
        {(category.eventCount ?? 0) > 0 && (
          <div className="mt-3 text-xs font-medium text-primary-600 bg-primary-50 px-2 py-1 rounded-full">
            {category.eventCount ?? 0} upcoming
          </div>
        )}
      </div>
    </Link>
  );
};

export default CategoryCard;
