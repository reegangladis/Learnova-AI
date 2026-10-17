import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit2, Trash2, Tag, AlertCircle, X, Shield } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { courseService } from "@/services/courseService";
import { CourseCategory, CourseCategoryCreatePayload, CourseCategoryUpdatePayload } from "@/types/course";

export function AdminCategoriesPage() {
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CourseCategory | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [categoryToDelete, setCategoryToDelete] = useState<CourseCategory | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  // Fetch all categories (active and inactive)
  const {
    data: categories = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["course-categories-admin"],
    queryFn: () => courseService.listCategories(false),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["course-categories-admin"] });
    queryClient.invalidateQueries({ queryKey: ["course-categories-active"] });
  };

  const createMutation = useMutation({
    mutationFn: (payload: CourseCategoryCreatePayload) => courseService.createCategory(payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string; payload: CourseCategoryUpdatePayload }) =>
      courseService.updateCategory(data.id, data.payload),
    onSuccess: () => {
      invalidate();
      closeModal();
    },
    onError: (err: Error) => setModalError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => courseService.deleteCategory(id),
    onSuccess: () => {
      invalidate();
      setCategoryToDelete(null);
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setDescription("");
    setIsActive(true);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: CourseCategory) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || "");
    setIsActive(cat.is_active);
    setModalError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setModalError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setModalError("Category name is required.");
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        payload: {
          name: name.trim(),
          slug: slug.trim() || undefined,
          description: description.trim() || undefined,
          is_active: isActive,
        },
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
        is_active: isActive,
      });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Course Categories
            </h1>
            <Badge variant="outline" className="gap-1 text-xs">
              <Shield className="h-3 w-3 text-primary" />
              Admin Management
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Organize curricula into taxonomy branches. Categories determine filtering across catalogs.
          </p>
        </div>

        <Button onClick={openCreateModal} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Categories Card & Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between">
            <span>All Taxonomic Categories</span>
            <span className="text-xs text-muted-foreground font-normal">
              {categories.length} total
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          )}

          {isError && (
            <div className="p-6 text-center text-destructive text-sm font-medium">
              {error instanceof Error ? error.message : "Failed to load categories."}
            </div>
          )}

          {!isLoading && !isError && categories.length === 0 && (
            <div className="text-center py-12 text-muted-foreground space-y-3">
              <Tag className="h-8 w-8 mx-auto text-primary/40" />
              <p className="text-sm">No course categories found.</p>
              <Button size="sm" onClick={openCreateModal}>
                Create First Category
              </Button>
            </div>
          )}

          {!isLoading && !isError && categories.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs font-semibold text-muted-foreground">
                    <th className="pb-3 px-3">Name</th>
                    <th className="pb-3 px-3">Slug</th>
                    <th className="pb-3 px-3">Description</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {categories.map((cat) => (
                    <tr key={cat.id} className="hover:bg-muted/10 transition-colors">
                      <td className="py-3 px-3 font-medium text-foreground">
                        {cat.name}
                      </td>
                      <td className="py-3 px-3 text-xs font-mono text-muted-foreground">
                        {cat.slug}
                      </td>
                      <td className="py-3 px-3 text-xs text-muted-foreground max-w-xs truncate">
                        {cat.description || "—"}
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={cat.is_active ? "default" : "outline"}
                          className="text-[11px]"
                        >
                          {cat.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditModal(cat)}
                            title="Edit Category"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-destructive/80 hover:text-destructive"
                            onClick={() => setCategoryToDelete(cat)}
                            title="Delete Category"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-bold text-base text-foreground">
                {editingCategory ? "Edit Category" : "New Course Category"}
              </h3>
              <button onClick={closeModal} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-xs text-destructive font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Category Name <span className="text-destructive">*</span>
                </label>
                <Input
                  placeholder="e.g. Artificial Intelligence"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Slug <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Input
                  placeholder="artificial-intelligence"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Classification scope and domain coverage..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="cat-active"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                />
                <label htmlFor="cat-active" className="text-xs font-medium text-foreground cursor-pointer">
                  Category is Active and selectable by instructors
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button type="button" variant="outline" size="sm" onClick={closeModal}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingCategory
                      ? "Save Changes"
                      : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in-50">
          <div className="bg-card border border-border rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-lg font-bold text-foreground">Delete Category</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Are you sure you want to delete category{" "}
              <strong className="text-foreground">{categoryToDelete.name}</strong>? Courses
              assigned to this category will have their category reference cleared safely.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCategoryToDelete(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => deleteMutation.mutate(categoryToDelete.id)}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
