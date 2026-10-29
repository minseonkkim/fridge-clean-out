import { notFound } from "next/navigation";
import { ModelGalleryLoader } from "./loader";

/** 개발용: 재료 3D 모델 전체 보기. 배포 빌드에서는 404. */
export default function ModelsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <ModelGalleryLoader />;
}
