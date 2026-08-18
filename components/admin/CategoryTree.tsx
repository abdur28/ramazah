"use client";

import React, { useState, useMemo } from "react";
import { 
  ChevronRight, 
  ChevronDown, 
  FolderOpen, 
  Folder,
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  GripVertical
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Category } from "@/types/types";

interface CategoryTreeProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddSubcategory: (parentCategory: Category) => void;
  searchQuery?: string;
}

interface TreeNode extends Category {
  children: TreeNode[];
  level: number;
}

interface CategoryTreeItemProps {
  node: TreeNode;
  allCategories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddSubcategory: (parentCategory: Category) => void;
  searchQuery?: string;
}

function CategoryTreeItem({ 
  node,
  allCategories,
  onEdit, 
  onDelete,
  onAddSubcategory,
  searchQuery 
}: CategoryTreeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  // Convert path to display format
  const getDisplayPath = (path: string): string => {
    return path
      .split('/')
      .map(segment => 
        segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ')
      )
      .join(' > ');
  };

  // Highlight search matches
  const highlightText = (text: string) => {
    if (!searchQuery) return text;
    
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 px-0.5 rounded">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div className="w-full">
      <div 
        className={cn(
          "flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group",
          node.level > 0 && "ml-6"
        )}
      >
        {/* Drag Handle */}
        <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
        
        {/* Expand/Collapse Button */}
        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        ) : (
          <div className="w-6" />
        )}

        {/* Folder Icon */}
        {isExpanded && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-blue-500" />
        ) : (
          <Folder className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Category Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">
              {highlightText(node.name)}
            </span>
            {hasChildren && (
              <Badge variant="secondary" className="text-xs">
                {node.children.length}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <code className="text-xs text-muted-foreground truncate">
              {highlightText(node.path)}
            </code>
            {node.level > 0 && (
              <Badge variant="outline" className="text-xs">
                Level {node.level + 1}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => onAddSubcategory(node)}
            title="Add subcategory"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onEdit(node)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddSubcategory(node)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Subcategory
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(node)}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Children */}
      {isExpanded && hasChildren && (
        <div className="ml-3 border-l-2 border-muted">
          {node.children.map((childNode) => (
            <CategoryTreeItem
              key={childNode.id}
              node={childNode}
              allCategories={allCategories}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddSubcategory={onAddSubcategory}
              searchQuery={searchQuery}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CategoryTree({ 
  categories, 
  onEdit, 
  onDelete,
  onAddSubcategory,
  searchQuery 
}: CategoryTreeProps) {
  // Build tree structure from flat categories using path
  const categoryTree = useMemo(() => {
    // Filter categories based on search first
    let filteredCategories = categories;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredCategories = categories.filter(cat => 
        cat.name.toLowerCase().includes(query) ||
        cat.slug.toLowerCase().includes(query) ||
        cat.path.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query))
      );
    }

    // Build tree from paths
    const buildTree = (cats: Category[]): TreeNode[] => {
      // Sort by path to ensure parents come before children
      const sortedCats = [...cats].sort((a, b) => a.path.localeCompare(b.path));
      
      // Create map for quick lookup
      const nodeMap = new Map<string, TreeNode>();
      
      // First pass: create all nodes
      sortedCats.forEach(cat => {
        const level = cat.path.split('/').length - 1;
        nodeMap.set(cat.path, {
          ...cat,
          children: [],
          level
        });
      });
      
      // Second pass: build parent-child relationships
      const rootNodes: TreeNode[] = [];
      
      sortedCats.forEach(cat => {
        const node = nodeMap.get(cat.path)!;
        const pathParts = cat.path.split('/');
        
        if (pathParts.length === 1) {
          // Root level
          rootNodes.push(node);
        } else {
          // Child level - find parent
          const parentPath = pathParts.slice(0, -1).join('/');
          const parentNode = nodeMap.get(parentPath);
          
          if (parentNode) {
            parentNode.children.push(node);
          } else {
            // Parent not found (possibly filtered out), add to root
            rootNodes.push(node);
          }
        }
      });
      
      return rootNodes;
    };
    
    return buildTree(filteredCategories);
  }, [categories, searchQuery]);

  if (categoryTree.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {searchQuery ? "No categories match your search" : "No categories to display"}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {categoryTree.map((node) => (
        <CategoryTreeItem
          key={node.id}
          node={node}
          allCategories={categories}
          onEdit={onEdit}
          onDelete={onDelete}
          onAddSubcategory={onAddSubcategory}
          searchQuery={searchQuery}
        />
      ))}
    </div>
  );
}