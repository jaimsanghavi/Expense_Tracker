import { getCategories } from "./actions";
import { CategoryList } from "./category-list";

export default async function CategoriesPage() {
  const categories = await getCategories();

  return <CategoryList initialCategories={categories} />;
}
