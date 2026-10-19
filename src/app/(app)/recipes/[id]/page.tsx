import { notFound } from "next/navigation";
import { RECIPE_BY_ID, RECIPES } from "@/data/recipes";
import { RecipeDetail } from "./recipe-detail";

/** 레시피는 앱 번들에 있으므로 모두 미리 만든다 (결정 D6). */
export function generateStaticParams() {
  return RECIPES.map((r) => ({ id: r.id }));
}

export async function generateMetadata({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  const recipe = RECIPE_BY_ID.get(id);
  return { title: recipe ? `${recipe.name} · 냉털 레시피` : "레시피 · 냉털 레시피" };
}

export default async function RecipePage({ params }: PageProps<"/recipes/[id]">) {
  const { id } = await params;
  if (!RECIPE_BY_ID.has(id)) notFound();
  return <RecipeDetail recipeId={id} />;
}
