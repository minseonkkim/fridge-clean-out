"use client";

import dynamic from "next/dynamic";

export const ModelGalleryLoader = dynamic(() => import("./gallery"), { ssr: false });
